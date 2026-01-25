"""
Migration: Fix use_cases table for facilitator-added use cases
- Make participant_id nullable
- Add added_by_facilitator boolean column

Supports both PostgreSQL and SQLite.
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))


def get_database_url():
    """Get and format database URL for async usage."""
    url = os.getenv("DATABASE_URL", "sqlite:///./hotspotmatrix.db")
    
    if "sqlite" in url:
        if "aiosqlite" not in url:
            url = url.replace("sqlite://", "sqlite+aiosqlite://")
    elif "postgresql" in url or "postgres://" in url:
        # Handle Supabase pooler connections
        if "pooler.supabase" in url:
            url = url.replace("postgres://", "postgresql+psycopg://")
            url = url.replace("postgresql://", "postgresql+psycopg://")
        else:
            url = url.replace("postgres://", "postgresql+asyncpg://")
            url = url.replace("postgresql://", "postgresql+asyncpg://")
        # Avoid double replacement
        url = url.replace("+asyncpg+asyncpg", "+asyncpg")
        url = url.replace("+psycopg+psycopg", "+psycopg")
    
    return url


async def run_migration():
    """Run the migration to fix use_cases table."""
    database_url = get_database_url()
    is_postgres = "postgresql" in database_url
    
    print(f"Starting migration: fix_usecase_facilitator_fields")
    print(f"Database type: {'PostgreSQL' if is_postgres else 'SQLite'}")
    
    connect_args = {}
    if "psycopg" in database_url:
        connect_args = {"prepare_threshold": None}
    
    engine = create_async_engine(database_url, echo=False, connect_args=connect_args)
    
    async with engine.begin() as conn:
        if is_postgres:
            # PostgreSQL: Check if column exists
            result = await conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'use_cases' AND column_name = 'added_by_facilitator'
            """))
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                print("Adding added_by_facilitator column...")
                await conn.execute(text("""
                    ALTER TABLE use_cases 
                    ADD COLUMN IF NOT EXISTS added_by_facilitator BOOLEAN DEFAULT FALSE
                """))
                print("✅ Added added_by_facilitator column")
            else:
                print("⏭️ added_by_facilitator column already exists")
            
            # PostgreSQL: Make participant_id nullable (ALTER COLUMN is supported)
            print("Making participant_id nullable...")
            await conn.execute(text("""
                ALTER TABLE use_cases 
                ALTER COLUMN participant_id DROP NOT NULL
            """))
            print("✅ participant_id is now nullable")
            
        else:
            # SQLite: Check if column exists using pragma
            result = await conn.execute(text("PRAGMA table_info(use_cases)"))
            columns = {row[1] for row in result.fetchall()}
            
            if 'added_by_facilitator' not in columns:
                print("Adding added_by_facilitator column...")
                await conn.execute(text("""
                    ALTER TABLE use_cases 
                    ADD COLUMN added_by_facilitator BOOLEAN DEFAULT 0
                """))
                print("✅ Added added_by_facilitator column")
            else:
                print("⏭️ added_by_facilitator column already exists")
            
            # SQLite: Recreate table to make participant_id nullable
            print("Recreating use_cases table to make participant_id nullable...")
            
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS use_cases_new (
                    id CHAR(36) NOT NULL PRIMARY KEY,
                    workshop_id CHAR(36) NOT NULL,
                    participant_id CHAR(36),
                    added_by_facilitator BOOLEAN DEFAULT 0,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    proposed_solution TEXT,
                    kpi TEXT,
                    target_user VARCHAR,
                    category VARCHAR,
                    status VARCHAR DEFAULT 'PENDING',
                    FOREIGN KEY(workshop_id) REFERENCES workshops (id),
                    FOREIGN KEY(participant_id) REFERENCES participants (id)
                )
            """))
            
            await conn.execute(text("""
                INSERT INTO use_cases_new (id, workshop_id, participant_id, title, description, 
                                           proposed_solution, kpi, target_user, category, status, added_by_facilitator)
                SELECT id, workshop_id, participant_id, title, description, 
                       proposed_solution, kpi, target_user, category, status, 
                       COALESCE(added_by_facilitator, 0)
                FROM use_cases
            """))
            
            await conn.execute(text("DROP TABLE use_cases"))
            await conn.execute(text("ALTER TABLE use_cases_new RENAME TO use_cases"))
            print("✅ use_cases table recreated with nullable participant_id")
    
    await engine.dispose()
    print("\n✅ Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
