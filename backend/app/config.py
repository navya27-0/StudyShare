from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "StudyShare API"
    APP_VERSION: str = "0.2.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    BACKEND_PORT: int = 8000
    DATABASE_URL: str = (
        "postgresql+asyncpg://studyshare:studyshare_dev@localhost:5433/studyshare_db"
    )
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # JWT Authentication Settings
    JWT_SECRET_KEY: str = "studyshare_jwt_secret_dev_key_change_in_production_9e4f01a2"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REFRESH_COOKIE_SAMESITE: str = "lax"  # "lax" | "none" | "strict"

    # Rate Limiting Settings (Login Protection)
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 300

    # Reverse Proxy & Security Settings
    TRUSTED_PROXIES: str = "127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
    ALLOW_PRODUCTION_SEED: bool = False
    SCHEDULED_CLEANUP_ENABLED: bool = False
    SECURITY_CLEANUP_INTERVAL_SECONDS: int = 21600  # 6 hours
    LOGIN_ATTEMPT_RETENTION_HOURS: int = 24

    # Storage Settings
    STORAGE_BACKEND: str = "local"  # "local" | "s3"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 50 * 1024 * 1024  # 50 MB
    S3_BUCKET_NAME: str = "studyshare-academic-assets"
    S3_ENDPOINT_URL: str | None = None
    S3_REGION_NAME: str = "us-east-1"
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_PUBLIC_DOMAIN: str | None = (
        None  # Leave None in production to enforce governed presigned URL delivery and prevent moderation bypass
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Strictly fail application initialization if production runs with insecure dev defaults."""
        if self.ENVIRONMENT.strip().lower() in ("production", "prod"):
            errors: list[str] = []
            if (
                self.JWT_SECRET_KEY == "studyshare_jwt_secret_dev_key_change_in_production_9e4f01a2"
                or "dev_key" in self.JWT_SECRET_KEY
                or len(self.JWT_SECRET_KEY) < 32
            ):
                errors.append(
                    "JWT_SECRET_KEY must be a unique, cryptographically strong secret of at least 32 characters in production."
                )
            if "studyshare_dev" in self.DATABASE_URL:
                errors.append(
                    "DATABASE_URL contains default development credentials ('studyshare_dev'). A secure managed database credential is required."
                )
            if self.DEBUG:
                errors.append("DEBUG mode must be set to False in production.")
            if self.REFRESH_COOKIE_SAMESITE.strip().lower() not in ("lax", "none", "strict"):
                errors.append(
                    "REFRESH_COOKIE_SAMESITE must be one of 'lax', 'none', or 'strict' in production."
                )

            if errors:
                raise ValueError("Production Startup Security Violation:\n- " + "\n- ".join(errors))

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
