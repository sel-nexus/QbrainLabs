"""
Migration script to add created_at and updated_at columns to existing tables.
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root before importing app modules
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

from sqlalchemy import text
from app.core.database import engine

async def add_timestamp_columns():
    """Add created_at and updated_at columns to tables that don't have them."""
    print("🔧 Adding timestamp columns to existing tables...")
    
    async with engine.begin() as conn:
        # Add columns to users table
        try:
            await conn.execute(text('''
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            '''))
            print("✅ Added timestamp columns to users table")
        except Exception as e:
            print(f"⚠️  Users table: {e}")
        
        # Add columns to workshops table
        try:
            await conn.execute(text('''
                ALTER TABLE workshops 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            '''))
            print("✅ Added timestamp columns to workshops table")
        except Exception as e:
            print(f"⚠️  Workshops table: {e}")

    print("✨ Migration complete!")

if __name__ == "__main__":
    asyncio.run(add_timestamp_columns())
