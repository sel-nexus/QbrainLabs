from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from app.core.config import settings
import ssl


def is_supabase_or_pgbouncer() -> bool:
    """Check if using Supabase or pgbouncer (pooler in URL)."""
    url = settings.DATABASE_URL.lower()
    return "pooler.supabase" in url or "pgbouncer" in url


def get_database_url() -> str:
    """
    Convert DATABASE_URL to async-compatible format.
    Supports both PostgreSQL and SQLite (for testing).
    For Supabase/pgbouncer, use psycopg async driver instead of asyncpg.
    """
    url = settings.DATABASE_URL
    
    if "sqlite" in url:
        # SQLite async driver
        if "sqlite+aiosqlite" not in url:
            return url.replace("sqlite://", "sqlite+aiosqlite://")
        return url
    elif "postgresql" in url or "postgres://" in url:
        # For Supabase/pgbouncer, use psycopg which handles prepared statements better
        if is_supabase_or_pgbouncer():
            # Use psycopg async driver for pgbouncer compatibility
            url = url.replace("postgres://", "postgresql+psycopg://")
            url = url.replace("postgresql://", "postgresql+psycopg://")
            # Ensure we don't double-replace
            url = url.replace("postgresql+psycopg+psycopg://", "postgresql+psycopg://")
        else:
            # Use asyncpg for direct PostgreSQL connections
            if "postgresql+asyncpg" not in url:
                url = url.replace("postgres://", "postgresql+asyncpg://")
                url = url.replace("postgresql://", "postgresql+asyncpg://")
        return url
    else:
        # Return as-is for other databases
        return url


def get_engine_kwargs() -> dict:
    """
    Get engine configuration based on database type.
    PostgreSQL gets connection pooling, SQLite gets NullPool.
    Supabase/pgbouncer requires statement_cache_size=0.
    """
    url = settings.DATABASE_URL
    
    if "sqlite" in url:
        # SQLite requires special handling for async
        return {
            "echo": settings.DB_ECHO,
            "connect_args": {"check_same_thread": False},
            "poolclass": NullPool,  # SQLite doesn't support connection pooling well
        }
    elif is_supabase_or_pgbouncer():
        # Supabase/pgbouncer: use psycopg driver with NullPool
        # pgbouncer handles pooling, so we use NullPool on our side
        # Disable prepared statements with prepare_threshold=0 for pgbouncer compatibility
        return {
            "echo": settings.DB_ECHO,
            "poolclass": NullPool,  # Let pgbouncer handle pooling
            "connect_args": {
                "prepare_threshold": 0,  # Disable prepared statements for pgbouncer
            },
        }
    else:
        # Direct PostgreSQL connection pool settings
        return {
            "echo": settings.DB_ECHO,
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
            "pool_pre_ping": True,  # Verify connections before use
        }


SQLALCHEMY_DATABASE_URL = get_database_url()

engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    **get_engine_kwargs()
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()


async def get_db():
    """Dependency that provides a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
