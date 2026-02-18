"""
Migration: Add facilitator_group_id to use_cases table
Supports grouping facilitator-added use cases across multiple workshops.

When a facilitator adds a use case to N workshops, N UseCase records are created,
all sharing the same facilitator_group_id so they can be displayed together.
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))


def get_database_url():
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise ValueError("DATABASE_URL environment variable not set")

    if "sqlite" in url:
        if "aiosqlite" not in url:
            url = url.replace("sqlite://", "sqlite+aiosqlite://")
    elif "postgresql" in url or "postgres://" in url:
        if "pooler.supabase" in url:
            url = url.replace("postgres://", "postgresql+psycopg://")
            url = url.replace("postgresql://", "postgresql+psycopg://")
        else:
            url = url.replace("postgres://", "postgresql+asyncpg://")
            url = url.replace("postgresql://", "postgresql+asyncpg://")
        url = url.replace("+asyncpg+asyncpg", "+asyncpg")
        url = url.replace("+psycopg+psycopg", "+psycopg")

    return url


async def run_migration():
    database_url = get_database_url()
    is_postgres = "postgresql" in database_url

    print("Starting migration: facilitator_usecase_workshops")
    print(f"Database type: {'PostgreSQL' if is_postgres else 'SQLite'}")

    connect_args = {}
    if "psycopg" in database_url:
        connect_args = {"prepare_threshold": None}

    engine = create_async_engine(database_url, echo=False, connect_args=connect_args)

    async with engine.begin() as conn:
        if is_postgres:
            result = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'use_cases' AND column_name = 'facilitator_group_id'
            """))
            column_exists = result.fetchone() is not None

            if not column_exists:
                print("Adding facilitator_group_id column to use_cases...")
                await conn.execute(text("""
                    ALTER TABLE use_cases
                    ADD COLUMN IF NOT EXISTS facilitator_group_id VARCHAR(36) DEFAULT NULL
                """))
                print("  Added facilitator_group_id column")
            else:
                print("  facilitator_group_id column already exists")

        else:
            # SQLite
            result = await conn.execute(text("PRAGMA table_info(use_cases)"))
            columns = {row[1] for row in result.fetchall()}

            if 'facilitator_group_id' not in columns:
                print("Adding facilitator_group_id column to use_cases...")
                await conn.execute(text("""
                    ALTER TABLE use_cases
                    ADD COLUMN facilitator_group_id VARCHAR(36) DEFAULT NULL
                """))
                print("  Added facilitator_group_id column")
            else:
                print("  facilitator_group_id column already exists")

    await engine.dispose()
    print("\nMigration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
