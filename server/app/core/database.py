from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import NullPool
from app.core.config import settings
import ssl


def is_supabase_or_pgbouncer() -> bool:
    """Check if using Supabase or pgbouncer (pooler in URL)."""
    url = settings.DATABASE_URL.lower()
    return "pooler.supabase" in url or "pgbouncer" in url


def get_database_url(for_async: bool = True) -> str:
    """
    Convert DATABASE_URL to appropriate format.
    For Supabase/pgbouncer, use psycopg2 (sync) to avoid prepared statement issues.
    """
    url = settings.DATABASE_URL
    
    if "sqlite" in url:
        if for_async:
            if "sqlite+aiosqlite" not in url:
                return url.replace("sqlite://", "sqlite+aiosqlite://")
        return url
    elif "postgresql" in url or "postgres://" in url:
        if is_supabase_or_pgbouncer():
            # Use psycopg2 (sync) for pgbouncer - no prepared statement issues
            url = url.replace("postgres://", "postgresql+psycopg2://")
            url = url.replace("postgresql://", "postgresql+psycopg2://")
            url = url.replace("postgresql+psycopg2+psycopg2://", "postgresql+psycopg2://")
        elif for_async:
            # Use asyncpg for direct PostgreSQL connections
            if "postgresql+asyncpg" not in url:
                url = url.replace("postgres://", "postgresql+asyncpg://")
                url = url.replace("postgresql://", "postgresql+asyncpg://")
        return url
    return url


def get_engine_kwargs() -> dict:
    """Get engine configuration based on database type."""
    url = settings.DATABASE_URL
    
    if "sqlite" in url:
        return {
            "echo": settings.DB_ECHO,
            "connect_args": {"check_same_thread": False},
            "poolclass": NullPool,
        }
    elif is_supabase_or_pgbouncer():
        # Supabase/pgbouncer: use NullPool (pgbouncer handles pooling)
        return {
            "echo": settings.DB_ECHO,
            "poolclass": NullPool,
        }
    else:
        # Direct PostgreSQL connection pool settings
        return {
            "echo": settings.DB_ECHO,
            "pool_size": settings.DB_POOL_SIZE,
            "max_overflow": settings.DB_MAX_OVERFLOW,
            "pool_timeout": settings.DB_POOL_TIMEOUT,
            "pool_recycle": settings.DB_POOL_RECYCLE,
            "pool_pre_ping": True,
        }


SQLALCHEMY_DATABASE_URL = get_database_url()

# For Supabase/pgbouncer, use synchronous engine (psycopg2 doesn't have prepared statement issues)
if is_supabase_or_pgbouncer():
    # Synchronous engine for pgbouncer compatibility
    sync_engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        **get_engine_kwargs()
    )
    # Wrap sync engine for async usage
    from sqlalchemy.ext.asyncio import async_sessionmaker, AsyncSession as AsyncSessionType
    from sqlalchemy.ext.asyncio.engine import create_async_engine as _create_async_engine
    
    # Use psycopg (async version with prepare_threshold=None)
    async_url = SQLALCHEMY_DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+psycopg://")
    engine = _create_async_engine(
        async_url,
        echo=settings.DB_ECHO,
        poolclass=NullPool,
        connect_args={"prepare_threshold": None},  # Disable prepared statements
    )
else:
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
