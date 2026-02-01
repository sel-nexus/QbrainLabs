"""
Quick database diagnostic script to check if votes are being saved.
Run this from the server directory with: python scripts/check_votes.py
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.database import get_db_session
from app.models.models import Vote, UseCase, Participant

async def check_votes():
    async for db in get_db_session():
        # Get all votes
        result = await db.execute(select(Vote))
        all_votes = result.scalars().all()
        
        print(f"\n=== TOTAL VOTES IN DATABASE: {len(all_votes)} ===\n")
        
        for vote in all_votes:
            print(f"Vote ID: {vote.id}")
            print(f"  Use Case ID: {vote.use_case_id}")
            print(f"  Participant ID: {vote.participant_id}")
            print(f"  Scores: {vote.scores}")
            print()
        
        # Get all use cases
        uc_result = await db.execute(select(UseCase))
        all_use_cases = uc_result.scalars().all()
        
        print(f"\n=== TOTAL USE CASES: {len(all_use_cases)} ===\n")
        for uc in all_use_cases[:5]:  # Show first 5
            print(f"UseCase ID: {uc.id}, Workshop ID: {uc.workshop_id}, Title: {uc.title}")
        
        # Get all participants
        p_result = await db.execute(select(Participant))
        all_participants = p_result.scalars().all()
        
        print(f"\n=== TOTAL PARTICIPANTS: {len(all_participants)} ===\n")
        for p in all_participants[:5]:  # Show first 5
            print(f"Participant ID: {p.id}, Name: {p.name}")
        
        break

if __name__ == "__main__":
    asyncio.run(check_votes())
