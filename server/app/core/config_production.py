"""
Production-ready configuration with environment variable validation
"""
import os
from typing import List, Optional
from functools import lru_cache

from pydantic import field_validator, ValidationInfo
from pydantic_settings import BaseSettings


class ProductionSettings(BaseSettings):
    """Production settings with validation and defaults"""
    
    # Application
    PROJECT_NAME: str = "Qbrain AI Labs"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: Optional[str] = None
    
    # Security
    SECRET_KEY: str
    JWT_SECRET_KEY: Optional[str] = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: Optional[str] = None
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_ENABLED: bool = True
    
    # AI Integration
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Feature Flags
    ENABLE_AI_FEATURES: bool = True
    ENABLE_WEBSOCKETS: bool = True
    ENABLE_METRICS: bool = True
    
    _KNOWN_INSECURE_KEYS = frozenset({
        "dev-secret-key-not-for-production-use-only",
        "CHANGE_ME_TO_A_SECURE_RANDOM_STRING_AT_LEAST_32_CHARS",
    })

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError('SECRET_KEY must be at least 32 characters')
        if v in cls._KNOWN_INSECURE_KEYS:
            raise ValueError(
                'SECRET_KEY matches a known insecure development key. '
                'Generate a secure key with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )
        return v
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v
    
    @property
    def jwt_secret(self) -> str:
        """Get JWT secret, falling back to SECRET_KEY if not set"""
        return self.JWT_SECRET_KEY or self.SECRET_KEY
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


class DevelopmentSettings(ProductionSettings):
    """Development settings with relaxed validation"""
    
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hotspotmatrix"
    SECRET_KEY: str = "dev-secret-key-not-for-production-use-only"
    LOG_FORMAT: str = "text"
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_dev_secret_key(cls, v: str) -> str:
        # Allow shorter keys in development
        return v


class TestingSettings(ProductionSettings):
    """Testing settings"""
    
    DEBUG: bool = True
    ENVIRONMENT: str = "testing"
    DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"
    SECRET_KEY: str = "test-secret-key-for-testing-only"
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_test_secret_key(cls, v: str) -> str:
        return v


@lru_cache()
def get_settings() -> ProductionSettings:
    """Get settings based on environment"""
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env == "production":
        return ProductionSettings()
    elif env == "testing":
        return TestingSettings()
    else:
        return DevelopmentSettings()


# Export settings instance
settings = get_settings()
