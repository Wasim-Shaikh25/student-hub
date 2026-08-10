from pydantic_settings import BaseSettings
from typing import Optional, Any
from pydantic import field_validator


class Settings(BaseSettings):
    # API
    APP_NAME: str = "CivicAudit API"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    SQLALCHEMY_ECHO: bool = False

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS (comma-separated string; parsed in main.py)
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000"

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = "civic-audit-evidence"
    AWS_REGION: str = "us-east-1"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Email (not used in POC, but kept optional for future)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Super admin (auto-created on startup from env)
    SUPER_ADMIN_EMAIL: Optional[str] = None
    SUPER_ADMIN_MOBILE: Optional[str] = None
    SUPER_ADMIN_PASSWORD: Optional[str] = None

    # Resolution auto-transition
    RESOLVED_CONFIDENCE_THRESHOLD: int = 75
    MIN_RESOLUTION_CONFIRMATIONS: int = 2

    # PostGIS
    POSTGIS_ENABLED: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
