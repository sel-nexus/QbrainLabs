
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.core.database import AsyncSessionLocal
from app.models.models import Workshop, UseCase, Vote
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.utils.matrix import calculate_matrix_position
import json

async def inspect():
    async with AsyncSessionLocal() as db:
        # Get all workshops
        result = await db.execute(select(Workshop).order_by(Workshop.created_at.desc()))
        workshops = result.scalars().all()
        
        print(f"Found {len(workshops)} workshops:")
        for w in workshops:
            if w.current_phase == 'ANALYSIS':
                print(f"\n--- Workshop: {w.title} ({w.id}) ---")
                template_id = w.config.get('template_id')
                print(f"Template: {template_id}")
                
                # Inspect individual votes for this workshop
                query = (
                    select(Vote)
                    .join(UseCase, Vote.use_case_id == UseCase.id)
                    .where(UseCase.workshop_id == w.id)
                    .options(selectinload(Vote.use_case), selectinload(Vote.participant))
                )
                result = await db.execute(query)
                votes = result.scalars().all()
                
                print(f"Individual Votes: {len(votes)}")
                for vote in votes:
                    if vote.scores:
                        x, y = calculate_matrix_position(vote.scores, template_id)
                        print(f"  - [{vote.use_case.title}] by {vote.participant.display_name} -> X: {x}, Y: {y} (Raw: {vote.scores})")
        
if __name__ == "__main__":
    asyncio.run(inspect())
