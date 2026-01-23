from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Hotspot Matrix"
    API_V1_STR: str = "/api/v1"
    # Using sqlite for local dev without docker
    DATABASE_URL: str = "sqlite:///./hotspotmatrix.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

settings = Settings()
