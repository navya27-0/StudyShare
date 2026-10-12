import threading
import time

from fastapi import HTTPException, status

from app.config import get_settings

settings = get_settings()


class LoginRateLimiter:
    """
    Thread-safe sliding-window rate limiter for login attempts with automatic TTL pruning.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, list[float]] = {}
        self._lock = threading.Lock()

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
        """Verify whether the key has exceeded the allowed failure attempts."""
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

    def record_failure(self, key: str) -> None:
        """Record an invalid login attempt."""
        now = time.time()
        with self._lock:
            valid = self._cleanup_old_attempts(key, now)
            valid.append(now)
            self._failures[key] = valid

    def reset(self, key: str) -> None:
        """Clear failed attempts upon a successful login."""
        with self._lock:
            self._failures.pop(key, None)

    def clear(self) -> None:
        """Clear all rate limiting failure state across all keys (useful for test isolation)."""
        with self._lock:
            self._failures.clear()
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
    Thread-safe TTL-bounded store of revoked refresh token digests for token rotation & logout.
    Automatically expires revoked entries once their natural refresh TTL has elapsed.
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

    def clear(self) -> None:
        with self._lock:
            self._revoked.clear()


counter_deduplicator = CounterDeduplicator(window_seconds=60)
revoked_token_store = RevokedTokenStore()

login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
)
