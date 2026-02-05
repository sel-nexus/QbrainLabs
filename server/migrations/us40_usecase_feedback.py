"""
Migration: US40 - Use Case Feedback Table
Creates the usecase_feedback table for participant feedback on use cases
"""
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def run_migration():
    """Create usecase_feedback table"""
    async with AsyncSessionLocal() as session:
        try:
            # Create usecase_feedback table
            await session.execute(text("""
                CREATE TABLE IF NOT EXISTS usecase_feedback (
                    id TEXT PRIMARY KEY,
                    usecase_id TEXT NOT NULL,
                    participant_id TEXT NOT NULL,
                    feedback_text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (usecase_id) REFERENCES use_cases(id) ON DELETE CASCADE,
                    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
                )
            """))
            
            # Create indexes for better query performance
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_usecase_feedback_usecase_id 
                ON usecase_feedback(usecase_id)
            """))
            
            await session.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_usecase_feedback_participant_id 
                ON usecase_feedback(participant_id)
            """))
            
            await session.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_usecase_feedback_unique 
                ON usecase_feedback(usecase_id, participant_id)
            """))
            
            await session.commit()
            print("✅ Migration US40 completed: usecase_feedback table created")
        except Exception as e:
            await session.rollback()
            print(f"❌ Migration US40 failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_migration())
