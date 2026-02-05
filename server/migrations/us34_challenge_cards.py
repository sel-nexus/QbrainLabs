"""
US34: Challenge Cards Migration

Creates table for challenge cards:
- challenge_cards - Challenge cards for workshops with success criteria

Supports PostgreSQL (production).
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine


async def create_challenge_cards_table():
    """Create challenge_cards table."""
    
    async with engine.begin() as conn:
        print("Creating challenge_cards table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS challenge_cards (
                id VARCHAR(36) PRIMARY KEY,
                workshop_id VARCHAR(36) NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                title VARCHAR(100) NOT NULL,
                challenge_description TEXT NOT NULL,
                success_criteria JSONB NOT NULL DEFAULT '[]',
                display_order INTEGER NOT NULL DEFAULT 0,
                created_by VARCHAR(36) NOT NULL REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                
                CONSTRAINT challenge_cards_title_length CHECK (char_length(title) <= 100),
                CONSTRAINT challenge_cards_description_length CHECK (char_length(challenge_description) <= 2000),
                CONSTRAINT challenge_cards_success_criteria_array CHECK (jsonb_typeof(success_criteria) = 'array')
            );
        """))
        
        # Create indexes
        indexes = [
            "CREATE INDEX IF NOT EXISTS ix_challenge_cards_workshop_id ON challenge_cards(workshop_id);",
            "CREATE INDEX IF NOT EXISTS ix_challenge_cards_created_by ON challenge_cards(created_by);",
            "CREATE INDEX IF NOT EXISTS ix_challenge_cards_display_order ON challenge_cards(workshop_id, display_order);",
        ]
        for idx in indexes:
            try:
                await conn.execute(text(idx))
            except Exception as e:
                print(f"  Note: {e}")
        
        # Create updated_at trigger function if it doesn't exist
        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """))
        
        # Create trigger for updated_at
        await conn.execute(text("DROP TRIGGER IF EXISTS update_challenge_cards_updated_at ON challenge_cards;"))
        await conn.execute(text("""
            CREATE TRIGGER update_challenge_cards_updated_at
                BEFORE UPDATE ON challenge_cards
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        """))
        
        await conn.commit()
    print("✅ Challenge cards table created")


async def run_migration():
    """Run the full migration."""
    print("=" * 60)
    print("US34: Challenge Cards Migration")
    print("=" * 60)
    
    try:
        # Create tables
        await create_challenge_cards_table()
        
        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    asyncio.run(run_migration())
