import pytest

from app.config import Settings


@pytest.mark.parametrize("environment", ["production", "prod", "PROD", " Production "])
def test_production_security_validation_normalizes_environment(environment: str) -> None:
    """Whitespace/case variants of production must not bypass startup security checks."""
    with pytest.raises(ValueError, match="Production Startup Security Violation"):
        Settings(
            ENVIRONMENT=environment,
            JWT_SECRET_KEY="studyshare_jwt_secret_dev_key_change_in_production_9e4f01a2",
            DATABASE_URL="postgresql+asyncpg://produser:prodpass@db.example.com/db",
            DEBUG=False,
        )

    settings = Settings(
        ENVIRONMENT=environment,
        JWT_SECRET_KEY="cryptographically-strong-test-secret-123456789",
        DATABASE_URL="postgresql+asyncpg://produser:prodpass@db.example.com/db",
        DEBUG=False,
    )
    assert settings.ENVIRONMENT == environment


def test_production_security_validation_rejects_invalid_samesite() -> None:
    """Production startup must reject invalid REFRESH_COOKIE_SAMESITE settings."""
    with pytest.raises(ValueError, match="REFRESH_COOKIE_SAMESITE must be one of"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="cryptographically-strong-test-secret-123456789",
            DATABASE_URL="postgresql+asyncpg://produser:prodpass@db.example.com/db",
            DEBUG=False,
            REFRESH_COOKIE_SAMESITE="invalid_value",
        )
