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


login_rate_limiter = LoginRateLimiter(
    max_attempts=settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    window_seconds=settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
)
