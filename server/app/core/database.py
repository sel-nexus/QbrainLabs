"""
Database Configuration - PostgreSQL Only
US33: Migrated from SQLite to PostgreSQL for production use.

This module configures SQLAlchemy for PostgreSQL with support for:
- Direct PostgreSQL connections (asyncpg)
- Supabase/pgbouncer connections (psycopg with disabled prepared statements)
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.pool import NullPool
from app.core.config import settings


def validate_postgresql_url() -> None:
    """Validate that DATABASE_URL is PostgreSQL."""
    url = settings.DATABASE_URL.lower()
    if "postgresql" not in url and "postgres" not in url:
        raise ValueError(
            "DATABASE_URL must be a PostgreSQL connection string. "
            "SQLite is no longer supported. "
            f"Current URL starts with: {settings.DATABASE_URL[:20]}..."
        )


def is_supabase_or_pgbouncer() -> bool:
    """Check if using Supabase or pgbouncer (pooler in URL)."""
    url = settings.DATABASE_URL.lower()
    return "pooler.supabase" in url or "pgbouncer" in url


def get_database_url(for_async: bool = True) -> str:
    """
    Convert DATABASE_URL to appropriate async driver format.
    
    For Supabase/pgbouncer: Uses psycopg with prepare_threshold=None
    For direct PostgreSQL: Uses asyncpg for best async performance
    """
    validate_postgresql_url()
    url = settings.DATABASE_URL
    
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


def get_engine_kwargs() -> dict:
    """
    Get PostgreSQL engine configuration.
    
    - Supabase/pgbouncer: NullPool (external pooler handles connections)
    - Direct PostgreSQL: Connection pool with health checks
    """
    if is_supabase_or_pgbouncer():
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
        connect_args={
            "prepare_threshold": None,  # Disable prepared statements for pgbouncer compatibility
            "connect_timeout": 5,  # 5 second connection timeout to prevent hanging
        },
    )
else:
    # Add query timeout for production safety
    engine_kwargs = get_engine_kwargs()
    engine_kwargs.setdefault("connect_args", {})
    engine_kwargs["connect_args"]["command_timeout"] = 30  # 30 second query timeout
    
    engine = create_async_engine(
        SQLALCHEMY_DATABASE_URL,
        **engine_kwargs
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
