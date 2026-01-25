"""
US33: System Settings Migration
Creates system_settings and settings_audit_log tables,
and seeds default configuration values.

Supports both PostgreSQL (production) and SQLite (development).
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, AsyncSessionLocal, Base
from app.core.config import settings
from app.models.settings import SystemSetting, SettingsAuditLog, DEFAULT_SYSTEM_SETTINGS


def is_postgresql() -> bool:
    """Check if we're using PostgreSQL. (Always True - SQLite no longer supported)"""
    return True  # PostgreSQL only as of US33


async def create_tables():
    """Create system_settings and settings_audit_log tables."""
    
    use_pg = is_postgresql()
    print(f"Database type: {'PostgreSQL' if use_pg else 'SQLite'}")
    
    if use_pg:
        # PostgreSQL-specific SQL with native types
        create_system_settings = """
        CREATE TABLE IF NOT EXISTS system_settings (
            id VARCHAR(36) PRIMARY KEY,
            key VARCHAR(100) UNIQUE NOT NULL,
            value JSONB NOT NULL,
            value_type VARCHAR(20) NOT NULL,
            default_value JSONB NOT NULL,
            category VARCHAR(50) NOT NULL,
            description TEXT,
            is_sensitive BOOLEAN DEFAULT FALSE,
            validation_rules JSONB,
            updated_by VARCHAR(36) REFERENCES users(id),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        """
        
        create_settings_audit_log = """
        CREATE TABLE IF NOT EXISTS settings_audit_log (
            id VARCHAR(36) PRIMARY KEY,
            setting_id VARCHAR(36) REFERENCES system_settings(id) ON DELETE SET NULL,
            setting_key VARCHAR(100) NOT NULL,
            old_value JSONB,
            new_value JSONB,
            changed_by VARCHAR(36) REFERENCES users(id),
            changed_at TIMESTAMPTZ DEFAULT NOW(),
            ip_address INET
        );
        """
    else:
        # SQLite-compatible SQL
        create_system_settings = """
        CREATE TABLE IF NOT EXISTS system_settings (
            id VARCHAR(36) PRIMARY KEY,
            key VARCHAR(100) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            value_type VARCHAR(20) NOT NULL,
            default_value TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            description TEXT,
            is_sensitive BOOLEAN DEFAULT FALSE,
            validation_rules TEXT,
            updated_by VARCHAR(36),
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        create_settings_audit_log = """
        CREATE TABLE IF NOT EXISTS settings_audit_log (
            id VARCHAR(36) PRIMARY KEY,
            setting_id VARCHAR(36),
            setting_key VARCHAR(100) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            changed_by VARCHAR(36),
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            FOREIGN KEY (setting_id) REFERENCES system_settings(id) ON DELETE SET NULL,
            FOREIGN KEY (changed_by) REFERENCES users(id)
        );
        """
    
    # Create indexes (same for both)
    create_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_settings_category ON system_settings(category);",
        "CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(key);",
        "CREATE INDEX IF NOT EXISTS idx_audit_setting ON settings_audit_log(setting_id);",
        "CREATE INDEX IF NOT EXISTS idx_audit_time ON settings_audit_log(changed_at);",
        "CREATE INDEX IF NOT EXISTS idx_audit_key ON settings_audit_log(setting_key);",
    ]
    
    async with engine.begin() as conn:
        print("Creating system_settings table...")
        await conn.execute(text(create_system_settings))
        
        print("Creating settings_audit_log table...")
        await conn.execute(text(create_settings_audit_log))
        
        print("Creating indexes...")
        for index_sql in create_indexes:
            try:
                await conn.execute(text(index_sql))
            except Exception as e:
                # Index might already exist
                print(f"  Note: {e}")
        
        await conn.commit()
    
    print("Tables created successfully!")


async def seed_default_settings():
    """Seed default system settings."""
    from app.services.settings_service import seed_default_settings
    
    async with AsyncSessionLocal() as db:
        count = await seed_default_settings(db)
        print(f"Seeded {count} default settings")


async def verify_migration():
    """Verify the migration was successful."""
    async with AsyncSessionLocal() as db:
        # Check tables exist
        result = await db.execute(text(
            "SELECT COUNT(*) FROM system_settings"
        ))
        count = result.scalar()
        print(f"system_settings table has {count} rows")
        
        # List settings by category
        result = await db.execute(text(
            "SELECT category, COUNT(*) as cnt FROM system_settings GROUP BY category"
        ))
        print("\nSettings by category:")
        for row in result:
            print(f"  {row[0]}: {row[1]} settings")


async def run_migration():
    """Run the full migration."""
    print("=" * 60)
    print("US33: System Settings Migration")
    print("=" * 60)
    
    try:
        await create_tables()
        await seed_default_settings()
        await verify_migration()
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\nError during migration: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(run_migration())
