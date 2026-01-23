from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import Vote, UseCase
from app.schemas.vote import VoteSubmit, VoteResponse
from app.core.socket_manager import sio 
from uuid import UUID

router = APIRouter()

@router.post("/", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def submit_vote(
    vote_in: VoteSubmit,
    db: AsyncSession = Depends(get_db)
):
    # Check if a vote already exists for this participant/usecase to update it instead?
    # For MVP we might just insert, but updating is safer for user error correction.
    
    existing = await db.execute(
        select(Vote).where(
            Vote.use_case_id == vote_in.use_case_id,
            Vote.participant_id == vote_in.participant_id
        )
    )
    existing_vote = existing.scalars().first()
    
    if existing_vote:
        existing_vote.scores = vote_in.scores
        db_vote = existing_vote
    else:
        db_vote = Vote(
            use_case_id=vote_in.use_case_id,
            participant_id=vote_in.participant_id,
            scores=vote_in.scores
        )
        db.add(db_vote)
    
    await db.commit()
    await db.refresh(db_vote)
    
    # Broadcast progress update (Participant count)
    # We need the workshop ID.
    use_case_res = await db.execute(select(UseCase).where(UseCase.id == vote_in.use_case_id))
    use_case = use_case_res.scalars().first()
    
    if use_case:
        # Count total votes for this card
        votes_res = await db.execute(select(Vote).where(Vote.use_case_id == use_case.id))
        count = len(votes_res.scalars().all())
        
        await sio.emit(
            'vote_update', 
            {'use_case_id': str(use_case.id), 'count': count}, 
            room=str(use_case.workshop_id)
        )
    
    return db_vote
