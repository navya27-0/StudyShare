import threading
import time
from collections import defaultdict

from fastapi import HTTPException, status

from app.config import get_settings

settings = get_settings()


class LoginRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter for login attempts."""

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def _cleanup_old_attempts(self, key: str, now: float) -> list[float]:
        cutoff = now - self.window_seconds
        valid_attempts = [ts for ts in self._failures[key] if ts > cutoff]
        self._failures[key] = valid_attempts
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
            self._cleanup_old_attempts(key, now)
            self._failures[key].append(now)

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

    def __init__(self, window_seconds: int = 30):
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
            # Periodic lightweight pruning when map grows large
            if len(self._seen) > 5000:
                cutoff = now - self.window_seconds
                self._seen = {k: ts for k, ts in self._seen.items() if ts > cutoff}
            return True

    def clear(self) -> None:
        with self._lock:
            self._seen.clear()


class RevokedTokenStore:
    """Thread-safe store of revoked refresh token digests for token rotation & logout."""

    def __init__(self) -> None:
        self._revoked: set[str] = set()
        self._lock = threading.Lock()

    def revoke(self, token: str) -> None:
        with self._lock:
            self._revoked.add(token)

    def is_revoked(self, token: str) -> bool:
        with self._lock:
            return token in self._revoked

    def clear(self) -> None:
        with self._lock:
            self._revoked.clear()


counter_deduplicator = CounterDeduplicator(window_seconds=30)
revoked_token_store = RevokedTokenStore()

login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
)
