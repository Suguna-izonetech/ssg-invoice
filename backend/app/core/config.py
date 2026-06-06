from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import secrets


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )

    # App
    APP_NAME: str = "Invoice Management System"
    DEBUG: bool = True
    SECRET_KEY: str = secrets.token_urlsafe(64)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgre%40123@localhost:5432/invoicedb"

    # JWT
    JWT_SECRET_KEY: str = secrets.token_urlsafe(64)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:8000"
    ]

    # Security
    MAX_ACTIVE_SESSIONS: int = 2
    RATE_LIMIT_PER_MINUTE: int = 60
    BCRYPT_ROUNDS: int = 12

    # Admin seed
    ADMIN_USERNAME: str = "admin"
    ADMIN_EMAIL: str = "admin@example.com"
    ADMIN_PASSWORD: str = "Admin@123456"


settings = Settings()