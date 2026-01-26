"""
Migration: Add Performance Indexes
Date: January 25, 2026
Purpose: Add missing indexes identified in code review for performance optimization
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine


async def add_performance_indexes():
    """
    Add missing indexes for performance optimization:
    - votes table: composite index on (use_case_id, participant_id)
    - workshops table: index on facilitator_id
    - participants table: index on workshop_id
    - votes table: index on use_case_id for aggregation queries
    """
    
    indexes = [
        # Composite unique index on votes (if not exists)
        """
        CREATE INDEX IF NOT EXISTS ix_votes_use_case_participant 
        ON votes(use_case_id, participant_id);
        """,
        
        # Index on workshops.facilitator_id (frequently queried)
        """
        CREATE INDEX IF NOT EXISTS ix_workshops_facilitator_id 
        ON workshops(facilitator_id);
        """,
        
        # Index on participants.workshop_id (frequently queried)
        """
        CREATE INDEX IF NOT EXISTS ix_participants_workshop_id 
        ON participants(workshop_id);
        """,
        
        # Index on votes.use_case_id (for aggregation queries)
        """
        CREATE INDEX IF NOT EXISTS ix_votes_use_case_id 
        ON votes(use_case_id);
        """,
        
        # Index on poll_responses.poll_id (for poll stats queries)
        """
        CREATE INDEX IF NOT EXISTS ix_poll_responses_poll_id 
        ON poll_responses(poll_id);
        """,
        
        # Index on poll_responses.participant_id (for user response queries)
        """
        CREATE INDEX IF NOT EXISTS ix_poll_responses_participant_id 
        ON poll_responses(participant_id);
        """,
        
        # Index on questions.workshop_id (for Q&A queries)
        """
        CREATE INDEX IF NOT EXISTS ix_questions_workshop_id 
        ON questions(workshop_id);
        """,
        
        # Index on question_upvotes.question_id (for upvote counts)
        """
        CREATE INDEX IF NOT EXISTS ix_question_upvotes_question_id 
        ON question_upvotes(question_id);
        """,
    ]
    
    async with engine.begin() as conn:
        for index_sql in indexes:
            try:
                await conn.execute(text(index_sql))
                print(f"✓ Created index: {index_sql.split('IF NOT EXISTS')[1].split()[0]}")
            except Exception as e:
                print(f"✗ Error creating index: {e}")
    
    print("\n✅ Performance indexes migration completed")


if __name__ == "__main__":
    import asyncio
    asyncio.run(add_performance_indexes())
