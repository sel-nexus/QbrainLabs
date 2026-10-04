"""Quick script to test PostgreSQL database connection."""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load production environment using script's directory as base
script_dir = Path(__file__).parent
env_path = script_dir.parent / ".env"
print(f"📁 Loading env from: {env_path}")
load_dotenv(env_path, override=True)

async def test_connection():
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    # Validate URL format
    if not database_url.startswith("postgresql://") and not database_url.startswith("postgres://"):
        print("❌ Invalid DATABASE_URL format!")
        print("   Expected: postgresql://user:password@host:port/database")
        print(f"   Got: {database_url[:50]}...")
        print("\n� For Supabase: Go to Settings → Database → Connection string (URI)")
        return False
    
    # Show host (hide credentials)
    host_part = database_url.split('@')[1] if '@' in database_url else database_url
    print(f"📡 Testing connection to: {host_part}")
    
    # Convert to asyncpg format
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://")
    
    engine = None
    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from sqlalchemy import text
        
        engine = create_async_engine(database_url, echo=False)
        
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            row = result.fetchone()
            if row and row[0] == 1:
                print("✅ Database connection successful!")
                
                # Get PostgreSQL version
                version_result = await conn.execute(text("SELECT version()"))
                version = version_result.fetchone()[0]
                print(f"📊 PostgreSQL version: {version.split(',')[0]}")
                return True
                
    except Exception as e:
        print(f"❌ Connection failed: {type(e).__name__}: {e}")
        return False
    finally:
        if engine:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_connection())
