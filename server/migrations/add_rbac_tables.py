"""
Database Migration Script for RBAC Tables
Implements US30: User Roles & Access Control System

This script adds the necessary columns and tables for role-based access control:
- Adds role, status, organization, last_login, disabled_at, disabled_by, mfa_enabled, mfa_secret to users table
- Creates workshop_facilitators table
- Creates member_sessions table
- Creates permissions table
- Creates role_audit_logs table
- Seeds default permissions

Run this script to migrate an existing database:
    python -m migrations.add_rbac_tables
"""
import sys
import os
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from app.core.config import settings

# Import DEFAULT_PERMISSIONS after path setup
try:
    from app.models.rbac import DEFAULT_PERMISSIONS
except ImportError:
    DEFAULT_PERMISSIONS = []


def get_sync_database_url() -> str:
    """Get synchronous database URL"""
    url = settings.DATABASE_URL
    # Convert to sync driver
    url = url.replace("postgresql+asyncpg://", "postgresql://")
    url = url.replace("postgresql+psycopg://", "postgresql+psycopg2://")
    if "postgresql://" in url and "+psycopg2" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://")
    return url


def run_migration():
    """Run the RBAC migration"""
    
    # Create synchronous engine
    database_url = get_sync_database_url()
    print(f"Connecting to database...")
    engine = create_engine(database_url)
    
    with engine.begin() as conn:
        print("Starting RBAC migration...")
        
        # Check if migration already applied (check for role column)
        try:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'role'"
            ))
            if result.fetchone():
                print("Migration already applied (role column exists)")
            else:
                # Add new columns to users table
                print("Adding RBAC columns to users table...")
                
                migrations = [
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'facilitator'",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255)",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_by CHAR(36) REFERENCES users(id)",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255)",
                ]
                
                for migration in migrations:
                    try:
                        conn.execute(text(migration))
                        print(f"  ✓ {migration[:60]}...")
                    except Exception as e:
                        print(f"  ⚠ Skipping (may already exist): {str(e)[:50]}")
                
                # Update existing admin users
                print("Updating existing admin users...")
                conn.execute(text(
                    "UPDATE users SET role = 'admin', status = 'active' WHERE is_admin = TRUE"
                ))
                conn.execute(text(
                    "UPDATE users SET role = 'facilitator', status = 'active' WHERE is_admin = FALSE AND status IS NULL"
                ))
                
        except Exception as e:
            print(f"Note: {e}")
        
        # Create workshop_facilitators table
        print("Creating workshop_facilitators table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS workshop_facilitators (
                id CHAR(36) PRIMARY KEY,
                workshop_id CHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                facilitator_id CHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                assigned_by CHAR(36) NOT NULL REFERENCES users(id),
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                can_edit BOOLEAN DEFAULT TRUE,
                can_delete BOOLEAN DEFAULT FALSE,
                UNIQUE(workshop_id, facilitator_id)
            )
        """))
        print("  ✓ workshop_facilitators table created")
        
        # Create member_sessions table
        print("Creating member_sessions table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS member_sessions (
                id CHAR(36) PRIMARY KEY,
                workshop_id CHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                display_name VARCHAR(100) NOT NULL,
                session_token VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                participant_id CHAR(36) REFERENCES participants(id)
            )
        """))
        print("  ✓ member_sessions table created")
        
        # Create permissions table
        print("Creating permissions table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS permissions (
                id CHAR(36) PRIMARY KEY,
                role VARCHAR(20) NOT NULL,
                resource VARCHAR(100) NOT NULL,
                action VARCHAR(50) NOT NULL,
                allowed BOOLEAN DEFAULT FALSE,
                UNIQUE(role, resource, action)
            )
        """))
        print("  ✓ permissions table created")
        
        # Create role_audit_logs table
        print("Creating role_audit_logs table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS role_audit_logs (
                id CHAR(36) PRIMARY KEY,
                user_id CHAR(36) REFERENCES users(id),
                action VARCHAR(100) NOT NULL,
                performed_by CHAR(36) REFERENCES users(id),
                old_value TEXT,
                new_value TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        print("  ✓ role_audit_logs table created")
        
        # Create indexes
        print("Creating indexes...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_users_role_status ON users(role, status)",
            "CREATE INDEX IF NOT EXISTS ix_workshop_facilitators_workshop ON workshop_facilitators(workshop_id)",
            "CREATE INDEX IF NOT EXISTS ix_workshop_facilitators_facilitator ON workshop_facilitators(facilitator_id)",
            "CREATE INDEX IF NOT EXISTS ix_member_sessions_workshop ON member_sessions(workshop_id)",
            "CREATE INDEX IF NOT EXISTS ix_member_sessions_token ON member_sessions(session_token)",
            "CREATE INDEX IF NOT EXISTS ix_permissions_role ON permissions(role)",
            "CREATE INDEX IF NOT EXISTS ix_role_audit_logs_user ON role_audit_logs(user_id)",
            "CREATE INDEX IF NOT EXISTS ix_role_audit_logs_created ON role_audit_logs(created_at)",
        ]
        
        for index in indexes:
            try:
                conn.execute(text(index))
                print(f"  ✓ Created index")
            except Exception as e:
                print(f"  ⚠ Index may already exist: {str(e)[:30]}")
        
        print("\nMigration completed successfully!")
        print("\nNext steps:")
        print("1. Seed default permissions by running: python -m migrations.seed_permissions")
        print("2. Verify existing admin users have role='admin' and status='active'")
        print("3. Test the new endpoints in the API documentation at /docs")


def seed_permissions():
    """Seed the default permissions"""
    database_url = get_sync_database_url()
    engine = create_engine(database_url)
    
    with engine.begin() as conn:
        print("Seeding default permissions...")
        
        for perm in DEFAULT_PERMISSIONS:
            try:
                conn.execute(text("""
                    INSERT INTO permissions (id, role, resource, action, allowed)
                    VALUES (:id, :role, :resource, :action, :allowed)
                    ON CONFLICT (role, resource, action) DO UPDATE
                    SET allowed = EXCLUDED.allowed
                """), {
                    "id": str(uuid.uuid4()),
                    "role": perm["role"],
                    "resource": perm["resource"],
                    "action": perm["action"],
                    "allowed": perm["allowed"]
                })
            except Exception as e:
                print(f"  ⚠ Permission may already exist: {perm}")
        
        print(f"  ✓ Seeded {len(DEFAULT_PERMISSIONS)} permissions")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="RBAC Migration Script")
    parser.add_argument("--seed", action="store_true", help="Seed default permissions")
    args = parser.parse_args()
    
    if args.seed:
        seed_permissions()
    else:
        run_migration()
