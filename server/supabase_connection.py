"""
Supabase PostgreSQL Connection Script
=====================================
This script provides multiple ways to connect to Supabase:
1. Supabase Python Client (recommended for most operations)
2. Direct PostgreSQL connection via asyncpg (for raw SQL)
3. SQLAlchemy async engine (for ORM-style operations)

Setup:
    pip install supabase asyncpg sqlalchemy[asyncio] python-dotenv
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
script_dir = Path(__file__).parent
env_path = script_dir.parent / ".env.production"
load_dotenv(env_path, override=True)


# =============================================================================
# Method 1: Supabase Python Client (Recommended)
# =============================================================================
def connect_supabase_client():
    """
    Connect using the official Supabase Python client.
    Best for: REST API operations, realtime subscriptions, auth
    """
    try:
        from supabase import create_client, Client
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not url or not key:
            print("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment")
            print("   Add these to your .env.production file:")
            print("   SUPABASE_URL=https://[project-ref].supabase.co")
            print("   SUPABASE_ANON_KEY=eyJ...")
            return None
        
        client: Client = create_client(url, key)
        print(f"✅ Supabase client connected to: {url}")
        return client
        
    except ImportError:
        print("❌ supabase package not installed. Run: pip install supabase")
        return None
    except Exception as e:
        print(f"❌ Supabase client error: {e}")
        return None


# =============================================================================
# Method 2: Direct PostgreSQL Connection (asyncpg)
# =============================================================================
async def connect_postgres_direct():
    """
    Connect directly to PostgreSQL using asyncpg.
    Best for: High-performance async operations, raw SQL queries
    """
    try:
        import asyncpg
        
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            print("❌ DATABASE_URL not found in environment")
            return None
        
        # Parse connection string
        # Supabase format: postgresql://postgres.[ref]:[pwd]@host:port/db
        if not database_url.startswith(("postgresql://", "postgres://")):
            print("❌ Invalid DATABASE_URL format")
            return None
        
        # Extract host for display (hide password)
        host_part = database_url.split('@')[1] if '@' in database_url else "unknown"
        print(f"📡 Connecting to: {host_part}")
        
        # Connect with SSL required (Supabase enforces SSL)
        conn = await asyncpg.connect(
            database_url,
            ssl='require',
            timeout=30
        )
        
        # Test connection
        version = await conn.fetchval("SELECT version()")
        print(f"✅ PostgreSQL connected: {version.split(',')[0]}")
        
        return conn
        
    except ImportError:
        print("❌ asyncpg not installed. Run: pip install asyncpg")
        return None
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {type(e).__name__}: {e}")
        return None


# =============================================================================
# Method 3: SQLAlchemy Async Engine
# =============================================================================
async def connect_sqlalchemy_async():
    """
    Connect using SQLAlchemy async engine.
    Best for: ORM operations, migrations, complex queries
    """
    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy import text
        
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            print("❌ DATABASE_URL not found in environment")
            return None
        
        # Convert to asyncpg format
        async_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        async_url = async_url.replace("postgres://", "postgresql+asyncpg://")
        
        # Add SSL requirement
        if "?" in async_url:
            async_url += "&ssl=require"
        else:
            async_url += "?ssl=require"
        
        engine = create_async_engine(
            async_url,
            echo=False,
            pool_size=5,
            max_overflow=10
        )
        
        # Test connection
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ SQLAlchemy async engine connected: {version.split(',')[0]}")
        
        return engine
        
    except ImportError:
        print("❌ SQLAlchemy not installed. Run: pip install sqlalchemy[asyncio] asyncpg")
        return None
    except Exception as e:
        print(f"❌ SQLAlchemy connection failed: {type(e).__name__}: {e}")
        return None


# =============================================================================
# Example Usage: CRUD Operations
# =============================================================================
async def demo_operations():
    """Demonstrate basic CRUD operations with Supabase."""
    
    print("\n" + "="*60)
    print("SUPABASE CONNECTION DEMO")
    print("="*60)
    
    # Try Supabase client first
    print("\n📦 Method 1: Supabase Python Client")
    print("-" * 40)
    client = connect_supabase_client()
    
    if client:
        try:
            # List tables (requires proper permissions)
            response = client.table('workshops').select('count', count='exact').execute()
            print(f"   Workshops table accessible, count query returned: {response.count}")
        except Exception as e:
            print(f"   Query test: {e}")
    
    # Try direct PostgreSQL
    print("\n📦 Method 2: Direct PostgreSQL (asyncpg)")
    print("-" * 40)
    conn = await connect_postgres_direct()
    
    if conn:
        try:
            # Get list of tables
            tables = await conn.fetch("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            print(f"   Tables in public schema: {[t['table_name'] for t in tables]}")
        finally:
            await conn.close()
            print("   Connection closed")
    
    # Try SQLAlchemy
    print("\n📦 Method 3: SQLAlchemy Async Engine")
    print("-" * 40)
    engine = await connect_sqlalchemy_async()
    
    if engine:
        try:
            from sqlalchemy import text
            async with engine.connect() as conn:
                result = await conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    LIMIT 5
                """))
                tables = result.fetchall()
                print(f"   First 5 tables: {[t[0] for t in tables]}")
        finally:
            await engine.dispose()
            print("   Engine disposed")
    
    print("\n" + "="*60)
    print("CONNECTION TEST COMPLETE")
    print("="*60)


# =============================================================================
# Quick Connection Test
# =============================================================================
async def quick_test():
    """Quick connection test - tries all methods."""
    print("\n🔍 Quick Connection Test")
    print("="*60)
    
    # Check environment variables
    print("\n📋 Environment Variables:")
    print(f"   SUPABASE_URL: {'✅ Set' if os.getenv('SUPABASE_URL') else '❌ Missing'}")
    print(f"   SUPABASE_ANON_KEY: {'✅ Set' if os.getenv('SUPABASE_ANON_KEY') else '❌ Missing'}")
    print(f"   DATABASE_URL: {'✅ Set' if os.getenv('DATABASE_URL') else '❌ Missing'}")
    
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Show host (hide credentials)
        if '@' in database_url:
            host = database_url.split('@')[1]
            print(f"   DATABASE_URL host: {host}")
    
    # Test PostgreSQL connection
    print("\n🔌 Testing PostgreSQL connection...")
    conn = await connect_postgres_direct()
    if conn:
        await conn.close()
        return True
    return False


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--demo":
        asyncio.run(demo_operations())
    else:
        asyncio.run(quick_test())
