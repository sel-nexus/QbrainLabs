from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Adjust connection string for async SQLite
if "sqlite" in settings.DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")
else:
    SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=True,
    # specific connect args for sqlite
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
