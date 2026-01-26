from pydantic_settings import BaseSettings
from pydantic import Field, field_validator
from typing import Optional
from pathlib import Path
import secrets

# Find .env file - check current dir, then parent dir (project root)
def find_env_file() -> str:
    current = Path(__file__).parent.parent.parent  # server/
    env_file = current / ".env"
    if env_file.exists():
        return str(env_file)
    parent_env = current.parent / ".env"  # project root
    if parent_env.exists():
        return str(parent_env)
    return ".env"  # fallback


class Settings(BaseSettings):
    PROJECT_NAME: str = "Qbrain AI Labs"
    API_V1_STR: str = "/api/v1"
    
    # Server Configuration
    HOST: str = Field(default="127.0.0.1", description="Server host/IP address")
    PORT: int = Field(default=8000, ge=1, le=65535, description="Server port number")
    SERVER_HOST: str = Field(default="0.0.0.0", description="Server bind host (for uvicorn)")
    SERVER_PORT: int = Field(default=8000, ge=1, le=65535, description="Server bind port (for uvicorn)")
    
    # Database - PostgreSQL (default for production-ready setup)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hotspotmatrix"
    
    # PostgreSQL Connection Pool Settings
    DB_POOL_SIZE: int = Field(default=10, ge=5, le=50)
    DB_MAX_OVERFLOW: int = Field(default=20, ge=10, le=100)
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # Recycle connections after 30 minutes
    DB_ECHO: bool = False  # Set to True for SQL query logging
    
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security - JWT Authentication
    # CRITICAL: Must be set via environment variable in production
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    SECRET_KEY: str = Field(
        default="CHANGE_ME_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS",
        min_length=32,
        description="Secret key for JWT tokens. MUST be set via SECRET_KEY environment variable in production."
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=43200, ge=15, le=43200)  # 30 days max
    
    # CORS Configuration
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://192.168.4.247:5173",
        description="Comma-separated list of allowed CORS origins (used as fallback or additional origins)"
    )
    ENABLE_DYNAMIC_CORS: bool = Field(
        default=True,
        description="Enable dynamic CORS that automatically accepts origins matching server IP addresses (private/public)"
    )
    CLIENT_PORT: int = Field(
        default=5173,
        ge=1,
        le=65535,
        description="Client/frontend port for generating dynamic CORS origins"
    )
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Ensure secret key is not the default hardcoded value in production"""
        if v == "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7":
            import warnings
            warnings.warn(
                "SECRET_KEY is using the default hardcoded value. "
                "This is a security risk! Set SECRET_KEY environment variable.",
                UserWarning
            )
        return v

    class Config:
        env_file = find_env_file()
        extra = "ignore"  # Ignore extra fields from .env

settings = Settings()
