"""
US15: Gamification System Migration
Creates participant_points, badges, participant_badges, achievements, workshop_teams, and team_members tables.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, AsyncSessionLocal

async def create_tables():
    """Create gamification tables."""
    
    # Participant Points
    create_points = """
    CREATE TABLE IF NOT EXISTS participant_points (
        id VARCHAR(36) PRIMARY KEY,
        participant_id VARCHAR(36) REFERENCES participants(id) ON DELETE CASCADE,
        workshop_id VARCHAR(36) REFERENCES workshops(id) ON DELETE CASCADE,
        points INTEGER DEFAULT 0,
        action VARCHAR(50),
        action_metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    
    # Badges
    create_badges = """
    CREATE TABLE IF NOT EXISTS badges (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        description TEXT,
        rarity VARCHAR(20) DEFAULT 'common',
        criteria JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    
    # Participant Badges
    create_participant_badges = """
    CREATE TABLE IF NOT EXISTS participant_badges (
        id VARCHAR(36) PRIMARY KEY,
        participant_id VARCHAR(36) REFERENCES participants(id) ON DELETE CASCADE,
        badge_id VARCHAR(36) REFERENCES badges(id) ON DELETE CASCADE,
        workshop_id VARCHAR(36) REFERENCES workshops(id) ON DELETE CASCADE,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(participant_id, badge_id)
    );
    """
    
    # Achievements
    create_achievements = """
    CREATE TABLE IF NOT EXISTS achievements (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        criteria JSONB,
        points_reward INTEGER DEFAULT 0
    );
    """

    # Teams
    create_teams = """
    CREATE TABLE IF NOT EXISTS workshop_teams (
        id VARCHAR(36) PRIMARY KEY,
        workshop_id VARCHAR(36) REFERENCES workshops(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """

    # Team Members
    create_team_members = """
    CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(36) PRIMARY KEY,
        team_id VARCHAR(36) REFERENCES workshop_teams(id) ON DELETE CASCADE,
        participant_id VARCHAR(36) REFERENCES participants(id) ON DELETE CASCADE
    );
    """
    
    async with engine.begin() as conn:
        print("Creating participant_points table...")
        await conn.execute(text(create_points))
        
        print("Creating badges table...")
        await conn.execute(text(create_badges))
        
        print("Creating participant_badges table...")
        await conn.execute(text(create_participant_badges))

        print("Creating achievements table...")
        await conn.execute(text(create_achievements))

        print("Creating workshop_teams table...")
        await conn.execute(text(create_teams))

        print("Creating team_members table...")
        await conn.execute(text(create_team_members))
        
        # Indexes
        print("Creating indexes...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_points_participant ON participant_points(participant_id);",
            "CREATE INDEX IF NOT EXISTS idx_participant_badges_p ON participant_badges(participant_id);",
            "CREATE INDEX IF NOT EXISTS idx_participant_badges_w ON participant_badges(workshop_id);",
            "CREATE INDEX IF NOT EXISTS idx_teams_workshop ON workshop_teams(workshop_id);"
        ]
        
        for idx in indexes:
             await conn.execute(text(idx))
             
        await conn.commit()
    
    print("Gamification tables created successfully!")

async def seed_badges():
    """Seed initial badges from US15."""
    import uuid
    from app.models.gamification import Badge, BadgeRarity
    
    default_badges = [
        # Participation
        {"name": "First Contributor", "icon": "target", "description": "First to submit a use case", "rarity": "common"},
        {"name": "Idea Generator", "icon": "lightbulb", "description": "Submit 5+ use cases in one workshop", "rarity": "uncommon"},
        {"name": "Quick Thinker", "icon": "zap", "description": "Vote within 15 seconds consistently", "rarity": "common"},
        # Quality
        {"name": "Quality Champion", "icon": "star", "description": "High AI quality score on use cases", "rarity": "rare"},
        # Engagement
        {"name": "Discussion Leader", "icon": "users", "description": "Most engagement in discussions", "rarity": "rare"},
         {"name": "All-Star", "icon": "star", "description": "Top performer in a workshop", "rarity": "epic"},
    ]
    
    async with AsyncSessionLocal() as db:
        for badge_data in default_badges:
            # Check if exists
            result = await db.execute(text(f"SELECT id FROM badges WHERE name = '{badge_data['name']}'"))
            if not result.scalar():
                new_badge = Badge(
                    id=str(uuid.uuid4()),
                    name=badge_data['name'],
                    icon=badge_data['icon'],
                    description=badge_data['description'],
                    rarity=badge_data['rarity']
                )
                db.add(new_badge)
        
        await db.commit()
        print("Default badges seeded.")

async def run_migration():
    try:
        await create_tables()
        await seed_badges()
    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(run_migration())
