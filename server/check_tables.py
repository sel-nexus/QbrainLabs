"""Check database tables and users."""
import asyncio
import sys
from pathlib import Path

# Windows event loop fix for psycopg
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Add server to path
sys.path.insert(0, str(Path(__file__).parent))

async def check_tables():
    from app.core.database import engine
    from sqlalchemy import text
    
    try:
        async with engine.connect() as conn:
            # Check tables
            result = await conn.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"📋 Found {len(tables)} tables:")
            for t in tables:
                print(f"   - {t}")
            
            # Check if users table exists and has data
            if 'users' in tables:
                # First check columns
                result = await conn.execute(text("""
                    SELECT column_name, data_type FROM information_schema.columns 
                    WHERE table_name = 'users' ORDER BY ordinal_position
                """))
                columns = result.fetchall()
                print(f"\n👥 Users table columns:")
                for col in columns:
                    print(f"   - {col[0]} ({col[1]})")
                
                result = await conn.execute(text("SELECT COUNT(*) FROM users"))
                count = result.fetchone()[0]
                print(f"\n   Total records: {count}")
                
                if count > 0:
                    result = await conn.execute(text("SELECT id, email, role FROM users LIMIT 5"))
                    print("   Sample users:")
                    for row in result.fetchall():
                        print(f"   - {row[1]} (role: {row[2]})")
            else:
                print("\n❌ 'users' table not found!")
                
    finally:
        pass  # Engine managed by app

if __name__ == "__main__":
    asyncio.run(check_tables())
