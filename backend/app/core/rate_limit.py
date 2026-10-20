import hashlib
import logging
import threading
import time
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.security import LoginAttempt, RevokedToken

logger = logging.getLogger("studyshare.security")
settings = get_settings()


def hash_token(token: str) -> str:
    """Compute SHA-256 hex digest of a token string to avoid persisting raw credentials."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class LoginRateLimiter:
    """
    Hybrid sliding-window rate limiter for login attempts.
    Maintains an in-memory sliding window for thread-safe local speed,
    while optionally synchronizing failure counters with PostgreSQL for multi-worker/replica safety.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        self.reset_failure_count: int = 0

    def _cleanup_old_attempts(self, key: str, now: float) -> list[float]:
        cutoff = now - self.window_seconds
        existing = self._failures.get(key)
        if not existing:
            return []
        valid_attempts = [ts for ts in existing if ts > cutoff]
        if valid_attempts:
            self._failures[key] = valid_attempts
        else:
            self._failures.pop(key, None)

        if len(self._failures) > 2000:
            stale_keys = [
                k
                for k, timestamps in self._failures.items()
                if not timestamps or timestamps[-1] <= cutoff
            ]
            for k in stale_keys:
                self._failures.pop(k, None)

        return valid_attempts

    def check(self, key: str) -> None:
        """Verify whether the key has exceeded the allowed failure attempts (in-memory fast path)."""
        now = time.time()
        with self._lock:
            attempts = self._cleanup_old_attempts(key, now)
            if len(attempts) >= self.max_attempts:
                oldest_in_window = attempts[0]
                retry_after = max(1, int(self.window_seconds - (now - oldest_in_window)))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Too many failed login attempts. Account temporarily locked for security. "
                        f"Please retry in {retry_after} seconds."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

    async def check_async(self, key: str, db: AsyncSession | None = None) -> None:
        """Verify whether the key has exceeded allowed failures across all workers."""
        now = time.time()
        with self._lock:
            mem_attempts = self._cleanup_old_attempts(key, now)

        db_count = 0
        oldest_ts = mem_attempts[0] if mem_attempts else now
        if db is not None:
            now_dt = datetime.now(UTC)
            cutoff_dt = now_dt - timedelta(seconds=self.window_seconds)
            try:
                count_stmt = select(func.count(LoginAttempt.id)).where(
                    LoginAttempt.key == key,
                    LoginAttempt.attempted_at > cutoff_dt,
                )
                db_count = (await db.execute(count_stmt)).scalar_one() or 0
            except HTTPException:
                raise
            except Exception as exc:
                logger.critical(
                    "Database failure while querying login attempts for '%s': %s. Failing closed.",
                    key,
                    exc,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service temporarily unavailable; login rate limit state could not be verified.",
                ) from exc

        total_attempts = max(len(mem_attempts), db_count)
        if total_attempts >= self.max_attempts:
            retry_after = max(1, int(self.window_seconds - (now - oldest_ts)))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Too many failed login attempts. Account temporarily locked for security. "
                    f"Please retry in {retry_after} seconds."
                ),
                headers={"Retry-After": str(retry_after)},
            )

    def record_failure(self, key: str) -> None:
        """Record an invalid login attempt in memory."""
        now = time.time()
        with self._lock:
            valid = self._cleanup_old_attempts(key, now)
            valid.append(now)
            self._failures[key] = valid

    async def record_failure_async(self, key: str, db: AsyncSession | None = None) -> None:
        """Record an invalid login attempt and synchronize across workers."""
        self.record_failure(key)
        if db is not None:
            try:
                attempt = LoginAttempt(key=key, attempted_at=datetime.now(UTC))
                db.add(attempt)
                await db.commit()
            except HTTPException:
                await db.rollback()
                raise
            except Exception as exc:
                await db.rollback()
                logger.critical(
                    "Failed to persist login failure record to database: %s. Failing closed.",
                    exc,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service temporarily unavailable; login failure state could not be recorded.",
                ) from exc

    def reset(self, key: str) -> None:
        """Clear failed attempts upon a successful login."""
        with self._lock:
            self._failures.pop(key, None)

    async def reset_async(self, key: str, db: AsyncSession | None = None) -> None:
        """
        Clear failed attempts upon a successful login across all workers.
        Fails closed with HTTP 503 if persistent database deletion fails, preventing
        stale failure records in PostgreSQL that could lock out the user on other workers.
        Increments telemetry metric reset_failure_count on failure.
        """
        self.reset(key)
        if db is not None:
            try:
                await db.execute(delete(LoginAttempt).where(LoginAttempt.key == key))
                await db.commit()
            except HTTPException:
                await db.rollback()
                raise
            except Exception as exc:
                await db.rollback()
                with self._lock:
                    self.reset_failure_count += 1
                logger.critical(
                    "Database failure while clearing login attempts for '%s': %s. Failing closed to prevent cross-worker stale lockout.",
                    key,
                    exc,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service temporarily unavailable; login rate-limit state could not be cleared.",
                ) from exc

    def clear(self) -> None:
        """Clear all rate limiting failure state across all keys (useful for test isolation)."""
        with self._lock:
            self._failures.clear()
            self.reset_failure_count = 0
        counter_deduplicator.clear()
        revoked_token_store.clear()


class CounterDeduplicator:
    """
    Thread-safe sliding-window deduplicator for view and download counters.
    Prevents rapid page refreshes or automated scripts from artificially inflating ranking metrics.
    """

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._seen: dict[str, float] = {}
        self._lock = threading.Lock()

    def should_increment(self, actor_key: str, resource_id: int, action: str) -> bool:
        """Return True if this actor has not triggered the same action on this resource within the window."""
        now = time.time()
        composite_key = f"{action}:{resource_id}:{actor_key}"
        with self._lock:
            last_seen = self._seen.get(composite_key)
            if last_seen is not None and (now - last_seen) < self.window_seconds:
                return False
            self._seen[composite_key] = now
            if len(self._seen) > 2000:
                cutoff = now - self.window_seconds
                self._seen = {k: ts for k, ts in self._seen.items() if ts > cutoff}
            return True

    def clear(self) -> None:
        with self._lock:
            self._seen.clear()


class RevokedTokenStore:
    """
    Hybrid TTL-bounded store of revoked refresh token digests for token rotation & logout.
    Combines thread-safe in-memory cache with PostgreSQL persistence for multi-worker safety.
    """

    def __init__(self, default_ttl_seconds: int | None = None) -> None:
        self.default_ttl_seconds = default_ttl_seconds or (
            settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
        )
        self._revoked: dict[str, float] = {}
        self._lock = threading.Lock()

    def _prune_expired(self, now: float) -> None:
        if len(self._revoked) > 1000:
            self._revoked = {k: exp for k, exp in self._revoked.items() if exp > now}

    def revoke(self, token: str, ttl_seconds: int | None = None) -> None:
        now = time.time()
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        with self._lock:
            self._prune_expired(now)
            self._revoked[token] = now + ttl

    async def revoke_async(
        self, token: str, db: AsyncSession | None = None, ttl_seconds: int | None = None
    ) -> None:
        """
        Revoke token in memory and persist SHA-256 hash in database for cross-worker invalidation.
        Fails closed with HTTP 503 if persistent database revocation fails, preventing false logout success.
        """
        self.revoke(token, ttl_seconds)
        if db is not None:
            thash = hash_token(token)
            ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
            exp_dt = datetime.now(UTC) + timedelta(seconds=ttl)
            try:
                rev_entry = RevokedToken(token_hash=thash, expires_at=exp_dt)
                db.add(rev_entry)
                await db.commit()
            except IntegrityError:
                # Token already revoked in database; duplicate insert rollback is safe
                await db.rollback()
            except HTTPException:
                await db.rollback()
                raise
            except Exception as exc:
                await db.rollback()
                logger.critical(
                    "Database error while persistently revoking token: %s. Failing closed.",
                    exc,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Authentication service temporarily unavailable; persistent token revocation failed.",
                ) from exc

    async def consume_token_atomically(
        self, token: str, db: AsyncSession, ttl_seconds: int | None = None
    ) -> bool:
        """
        Enforce single-use refresh token rotation atomically via database unique constraint.
        If concurrent requests attempt to consume the same refresh token, only one succeeds;
        the other encounters a uniqueness conflict or memory lock rejection and returns False.
        Fails closed on unhandled database errors.
        """
        # Fast path: check in-memory cache
        if self.is_revoked(token):
            return False

        now = time.time()
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        thash = hash_token(token)
        exp_dt = datetime.now(UTC) + timedelta(seconds=ttl)

        rev_entry = RevokedToken(token_hash=thash, expires_at=exp_dt)
        db.add(rev_entry)
        try:
            await db.commit()
        except IntegrityError:
            # Token was already consumed by a concurrent request
            await db.rollback()
            with self._lock:
                self._revoked[token] = now + ttl
            return False
        except Exception as exc:
            # Database failure: fail closed to prevent token reuse during outages
            await db.rollback()
            logger.critical(
                "Database error while atomically consuming refresh token: %s. Failing closed.",
                exc,
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Security verification service temporarily unavailable. Token cannot be safely consumed.",
            ) from exc

        # Success: record in local memory and return True
        with self._lock:
            self._prune_expired(now)
            self._revoked[token] = now + ttl
        return True

    def is_revoked(self, token: str) -> bool:
        now = time.time()
        with self._lock:
            exp = self._revoked.get(token)
            if exp is None:
                return False
            if exp <= now:
                self._revoked.pop(token, None)
                return False
            return True

    async def is_revoked_async(self, token: str, db: AsyncSession | None = None) -> bool:
        """
        Check if token is revoked in memory or in persistent database store.
        Fails closed on database exceptions to distinguish 'not revoked' from 'could not check'.
        """
        if self.is_revoked(token):
            return True

        if db is not None:
            thash = hash_token(token)
            now_dt = datetime.now(UTC)
            try:
                stmt = select(RevokedToken.id).where(
                    RevokedToken.token_hash == thash,
                    RevokedToken.expires_at > now_dt,
                )
                res = await db.execute(stmt)
                if res.scalar_one_or_none() is not None:
                    # Cache in local memory for future checks in this worker
                    with self._lock:
                        self._revoked[token] = time.time() + self.default_ttl_seconds
                    return True
            except Exception as exc:
                logger.error(
                    "Database failure while querying token revocation status: %s. Failing closed.",
                    exc,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Security verification service temporarily unavailable. Token status could not be verified.",
                ) from exc

        return False

    def clear(self) -> None:
        with self._lock:
            self._revoked.clear()


async def cleanup_security_tables(
    db: AsyncSession, login_retention_hours: int = 24
) -> dict[str, int]:
    """
    Prune expired revoked tokens and stale login attempts from PostgreSQL.
    Prevents unbounded table growth in production.
    Enforces that login_retention_hours >= 1 to prevent moving the cutoff into the future.
    """
    if login_retention_hours < 1:
        raise ValueError("login_retention_hours must be a positive integer (>= 1).")
    now_dt = datetime.now(UTC)
    cutoff_dt = now_dt - timedelta(hours=login_retention_hours)
    try:
        del_tokens_stmt = delete(RevokedToken).where(RevokedToken.expires_at <= now_dt)
        res_tokens = await db.execute(del_tokens_stmt)

        del_attempts_stmt = delete(LoginAttempt).where(LoginAttempt.attempted_at <= cutoff_dt)
        res_attempts = await db.execute(del_attempts_stmt)

        await db.commit()
        return {
            "pruned_tokens": res_tokens.rowcount or 0,
            "pruned_attempts": res_attempts.rowcount or 0,
        }
    except Exception as exc:
        await db.rollback()
        logger.error("Security table retention cleanup failed: %s", exc)
        raise


async def run_standalone_cleanup(retention_hours: int = 24) -> dict[str, int]:
    """
    Execute security table retention cleanup as a standalone command (for cron or scheduled container tasks).
    """
    from app.database import async_session_maker

    async with async_session_maker() as session:
        result = await cleanup_security_tables(session, login_retention_hours=retention_hours)
        logger.info("Security table cleanup complete: %s", result)
        return result


counter_deduplicator = CounterDeduplicator(window_seconds=60)
revoked_token_store = RevokedTokenStore()

login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
)

if __name__ == "__main__":
    import asyncio

    asyncio.run(run_standalone_cleanup())
