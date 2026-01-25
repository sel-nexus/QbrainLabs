"""
Database initialization and migration script
- Validates database connection
- Creates all tables if they don't exist
- Tracks and runs migrations
- Creates default admin user
"""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv

# Load .env file from project root before importing app modules
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.models import User
import bcrypt

DEFAULT_ADMIN_EMAIL = "admin@hotspotmatrix.ai"
DEFAULT_ADMIN_PASSWORD = "admin123"  # Should be changed on first login
DEFAULT_ADMIN_NAME = "Administrator"

# Migration tracking table SQL
CREATE_MIGRATION_TABLE = """
CREATE TABLE IF NOT EXISTS _migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    checksum VARCHAR(64)
);
"""


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


async def check_database_connection() -> bool:
    """Check if database is accessible."""
    print("🔗 Checking database connection...")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("\n💡 Troubleshooting tips:")
        print("   1. Ensure PostgreSQL is running")
        print("   2. Check DATABASE_URL in .env file")
        print("   3. Verify database 'hotspotmatrix' exists")
        print("   4. Check user credentials and permissions")
        return False


async def create_migration_tracking_table():
    """Create the migration tracking table if it doesn't exist."""
    async with engine.begin() as conn:
        await conn.execute(text(CREATE_MIGRATION_TABLE))
        await conn.commit()


async def get_applied_migrations() -> set:
    """Get the set of already applied migrations."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text(
                "SELECT migration_name FROM _migrations"
            ))
            return {row[0] for row in result.fetchall()}
    except Exception:
        # Table might not exist yet
        return set()


async def mark_migration_applied(migration_name: str, checksum: str = None):
    """Mark a migration as applied."""
    async with AsyncSessionLocal() as db:
        await db.execute(text(
            "INSERT INTO _migrations (migration_name, checksum) VALUES (:name, :checksum) "
            "ON CONFLICT (migration_name) DO NOTHING"
        ), {"name": migration_name, "checksum": checksum})
        await db.commit()


async def check_tables_exist() -> bool:
    """Check if the main tables already exist."""
    try:
        async with AsyncSessionLocal() as db:
            # Try to query the users table
            result = await db.execute(text(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
            ))
            return result.scalar()
    except Exception:
        return False


async def create_tables():
    """Create all database tables."""
    tables_exist = await check_tables_exist()
    
    if tables_exist:
        print("ℹ️  Core tables already exist, checking for schema updates...")
    else:
        print("🔧 Creating database tables...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ Database tables are up to date")


async def create_default_admin():
    """Create default admin user if not exists."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == DEFAULT_ADMIN_EMAIL))
        admin_user = result.scalars().first()
        
        if not admin_user:
            print(f"👤 Creating default admin user: {DEFAULT_ADMIN_EMAIL}")
            hashed_password = hash_password(DEFAULT_ADMIN_PASSWORD)
            admin_user = User(
                email=DEFAULT_ADMIN_EMAIL,
                password_hash=hashed_password,
                full_name=DEFAULT_ADMIN_NAME,
                is_admin=True
            )
            db.add(admin_user)
            await db.commit()
            print(f"✅ Admin user created successfully")
            print(f"   📧 Email: {DEFAULT_ADMIN_EMAIL}")
            print(f"   🔑 Password: {DEFAULT_ADMIN_PASSWORD}")
            print(f"   ⚠️  Please change the default password after first login!")
        else:
            print(f"ℹ️  Admin user already exists: {DEFAULT_ADMIN_EMAIL}")


async def run_migrations():
    """Run pending migrations from the migrations folder."""
    migrations_dir = Path(__file__).parent / "migrations"
    
    if not migrations_dir.exists():
        print("ℹ️  No migrations directory found")
        return 0
    
    # Get list of migration files
    migration_files = sorted([
        f for f in migrations_dir.glob("*.py")
        if not f.name.startswith("_") and f.name != "__init__.py"
    ])
    
    if not migration_files:
        print("ℹ️  No migration files found")
        return 0
    
    # Get already applied migrations
    applied = await get_applied_migrations()
    pending = [f for f in migration_files if f.stem not in applied]
    
    if not pending:
        print(f"ℹ️  All {len(migration_files)} migrations already applied")
        return 0
    
    print(f"🚀 Running {len(pending)} pending migrations...")
    
    success_count = 0
    for migration_file in pending:
        migration_name = migration_file.stem
        print(f"\n   📝 Applying: {migration_name}")
        
        try:
            # Import and run the migration
            import importlib.util
            spec = importlib.util.spec_from_file_location(migration_name, migration_file)
            module = importlib.util.module_from_spec(spec)
            sys.modules[migration_name] = module
            spec.loader.exec_module(module)
            
            # Look for run_migration or migrate function
            if hasattr(module, 'run_migration'):
                await module.run_migration()
            elif hasattr(module, 'migrate'):
                await module.migrate()
            else:
                print(f"   ⚠️  No run_migration() or migrate() function found, skipping")
                continue
            
            # Mark as applied
            await mark_migration_applied(migration_name)
            print(f"   ✅ Applied: {migration_name}")
            success_count += 1
            
        except Exception as e:
            print(f"   ⚠️  Migration {migration_name} failed or already applied: {str(e)[:100]}")
            # Still mark as "applied" if it's a duplicate/already exists error
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                await mark_migration_applied(migration_name)
    
    return success_count


async def get_database_info():
    """Get database information for status report."""
    try:
        async with AsyncSessionLocal() as db:
            # Get table count
            result = await db.execute(text(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
            ))
            table_count = result.scalar()
            
            # Get migration count
            try:
                result = await db.execute(text("SELECT COUNT(*) FROM _migrations"))
                migration_count = result.scalar()
            except Exception:
                migration_count = 0
            
            # Get user count
            try:
                result = await db.execute(text("SELECT COUNT(*) FROM users"))
                user_count = result.scalar()
            except Exception:
                user_count = 0
            
            return {
                "tables": table_count,
                "migrations": migration_count,
                "users": user_count
            }
    except Exception:
        return None


async def init_db():
    """Full database initialization workflow."""
    # Step 1: Check connection
    if not await check_database_connection():
        return False
    
    # Step 2: Create migration tracking table
    print("\n🗄️  Setting up migration tracking...")
    await create_migration_tracking_table()
    
    # Step 3: Create/update tables
    print("\n🔧 Initializing database schema...")
    await create_tables()
    
    # Step 4: Run pending migrations
    print("\n📦 Checking for pending migrations...")
    migrations_run = await run_migrations()
    
    # Step 5: Create default admin
    print("\n👤 Checking admin user...")
    await create_default_admin()
    
    # Step 6: Show status
    print("\n📊 Database Status:")
    info = await get_database_info()
    if info:
        print(f"   Tables: {info['tables']}")
        print(f"   Migrations applied: {info['migrations']}")
        print(f"   Users: {info['users']}")
    
    return True


def main():
    """Main entry point."""
    print("=" * 60)
    print("AI Hotspot Matrix - Database Initialization")
    print("=" * 60)
    
    success = asyncio.run(init_db())
    
    print("\n" + "=" * 60)
    if success:
        print("✨ Database initialization complete!")
    else:
        print("❌ Database initialization failed!")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
