from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

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
    PROJECT_NAME: str = "AI Hotspot Matrix"
    API_V1_STR: str = "/api/v1"
    
    # Database - PostgreSQL (default for production-ready setup)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/hotspotmatrix"
    
    # PostgreSQL Connection Pool Settings
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # Recycle connections after 30 minutes
    DB_ECHO: bool = False  # Set to True for SQL query logging
    
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security - JWT Authentication
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = find_env_file()
        extra = "ignore"  # Ignore extra fields from .env

settings = Settings()
