from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Hotspot Matrix"
    API_V1_STR: str = "/api/v1"
    # Using sqlite for local dev without docker
    DATABASE_URL: str = "sqlite:///./hotspotmatrix.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security - JWT Authentication
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # Change in production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days

    class Config:
        env_file = ".env"

settings = Settings()
