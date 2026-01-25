"""
Database Migration for US32: Facilitator Approval Workflow & Rate Limiting

This migration creates the following tables:
1. facilitator_registration_log - Tracks registration attempts for rate limiting
2. facilitator_access_requests - Stores facilitator access requests via PIN

Run this migration after deploying the updated models.
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./hotspotmatrix.db")

# Convert postgres:// to postgresql:// if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "asyncpg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


async def run_migration():
    """Run the migration to create US32 tables"""
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    async with engine.begin() as conn:
        # Check if tables already exist
        check_sql = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'facilitator_registration_log'
        );
        """
        
        try:
            result = await conn.execute(text(check_sql))
            exists = result.scalar()
        except Exception:
            # SQLite doesn't have information_schema
            exists = False
        
        if not exists:
            print("Creating facilitator_registration_log table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS facilitator_registration_log (
                    id VARCHAR(36) PRIMARY KEY,
                    registration_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    email VARCHAR(255) NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            # Create index for efficient querying
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_registration_timestamp 
                ON facilitator_registration_log(registration_timestamp);
            """))
            print("✅ facilitator_registration_log table created")
        else:
            print("⏭️ facilitator_registration_log table already exists")
        
        # Check for facilitator_access_requests table
        check_sql2 = """
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'facilitator_access_requests'
        );
        """
        
        try:
            result = await conn.execute(text(check_sql2))
            exists2 = result.scalar()
        except Exception:
            exists2 = False
        
        if not exists2:
            print("Creating facilitator_access_requests table...")
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS facilitator_access_requests (
                    id VARCHAR(36) PRIMARY KEY,
                    request_id VARCHAR(50) UNIQUE NOT NULL,
                    workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                    requester_name VARCHAR(100) NOT NULL,
                    requester_email VARCHAR(255),
                    requester_session_id VARCHAR(36),
                    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reviewed_at TIMESTAMP,
                    reviewed_by VARCHAR(36) REFERENCES users(id),
                    rejection_reason TEXT,
                    notes TEXT
                );
            """))
            
            # Create indexes
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_far_workshop_status 
                ON facilitator_access_requests(workshop_id, status);
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_far_status_created 
                ON facilitator_access_requests(status, created_at);
            """))
            print("✅ facilitator_access_requests table created")
        else:
            print("⏭️ facilitator_access_requests table already exists")
    
    await engine.dispose()
    print("\n✅ US32 Migration completed successfully!")


if __name__ == "__main__":
    asyncio.run(run_migration())
