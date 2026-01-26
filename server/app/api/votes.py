from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Vote, UseCase, Participant
from app.schemas.vote import VoteSubmit, VoteResponse
from app.core.socket_manager import sio 
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class ParticipantMatrixPosition(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    x: float
    y: float
    scores: dict
    vote_count: int = 1
    variance: float = 0

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
    
    # Get previous position BEFORE updating (for matrix position updates)
    previous_position = None
    if existing_vote and existing_vote.scores and 'Feasibility' in existing_vote.scores and 'Business Value' in existing_vote.scores:
        previous_position = {
            'x': existing_vote.scores.get('Feasibility', 0),
            'y': existing_vote.scores.get('Business Value', 0)
        }
    
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
        
        # If this vote contains matrix position data (Feasibility and Business Value),
        # emit matrix position update event for facilitators
        if vote_in.scores and 'Feasibility' in vote_in.scores and 'Business Value' in vote_in.scores:
            # Get participant info
            participant_res = await db.execute(select(Participant).where(Participant.id == vote_in.participant_id))
            participant = participant_res.scalars().first()
            
            # Emit matrix position update
            event_data = {
                'participant_id': str(vote_in.participant_id),
                'participant_name': participant.display_name if participant else 'Participant',
                'use_case_id': str(use_case.id),
                'use_case_title': use_case.title,
                'position': {
                    'x': vote_in.scores.get('Feasibility', 0),
                    'y': vote_in.scores.get('Business Value', 0)
                },
                'previous_position': previous_position
            }
            print(f"Emitting matrix:position_update to workshop {use_case.workshop_id}: {event_data}")
            await sio.emit(
                'matrix:position_update',
                event_data,
                room=str(use_case.workshop_id)
            )
    
    return db_vote


@router.get("/participant/{participant_id}/matrix-positions", response_model=List[ParticipantMatrixPosition])
async def get_participant_matrix_positions(
    participant_id: str,
    workshop_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Get participant-specific matrix positions.
    Returns only use cases that the participant has positioned on the matrix.
    """
    # Build query for participant's votes with matrix positions
    try:
        participant_uuid = UUID(participant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid participant ID format")
    
    query = (
        select(Vote)
        .join(UseCase, Vote.use_case_id == UseCase.id)
        .where(Vote.participant_id == participant_uuid)
        .options(selectinload(Vote.use_case))
    )
    
    # Filter by workshop if provided
    if workshop_id:
        try:
            workshop_uuid = UUID(workshop_id)
            query = query.where(UseCase.workshop_id == workshop_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid workshop ID format")
    
    result = await db.execute(query)
    votes = result.scalars().all()
    
    positions = []
    print(f"Fetching matrix positions for participant {participant_id}, workshop {workshop_id}")
    for vote in votes:
        # Only include votes that have Feasibility and Business Value scores (matrix positions)
        if (vote.scores and 
            'Feasibility' in vote.scores and 
            'Business Value' in vote.scores):
            
            use_case = vote.use_case
            positions.append(ParticipantMatrixPosition(
                id=str(use_case.id),
                title=use_case.title,
                description=use_case.description,
                category=use_case.category,
                x=float(vote.scores['Feasibility']),
                y=float(vote.scores['Business Value']),
                scores={
                    'Feasibility': float(vote.scores['Feasibility']),
                    'Business Value': float(vote.scores['Business Value'])
                },
                vote_count=1,  # This is the participant's own vote
                variance=0
            ))
    
    print(f"Found {len(positions)} matrix positions for participant {participant_id}")
    return positions


class AllParticipantMatrixPosition(BaseModel):
    use_case_id: str
    use_case_title: str
    participant_id: str
    participant_name: str
    x: float
    y: float
    scores: dict


@router.get("/workshop/{workshop_id}/all-matrix-positions", response_model=List[AllParticipantMatrixPosition])
async def get_all_participant_matrix_positions(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all participant matrix positions for a workshop.
    Returns all use cases positioned by all participants, each with unique participant info.
    Used by facilitators to see all participant positions with unique colors.
    """
    try:
        workshop_uuid = UUID(workshop_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workshop ID format")
    
    # Get all votes for this workshop that have matrix positions
    query = (
        select(Vote)
        .join(UseCase, Vote.use_case_id == UseCase.id)
        .join(Participant, Vote.participant_id == Participant.id)
        .where(UseCase.workshop_id == workshop_uuid)
        .options(selectinload(Vote.use_case), selectinload(Vote.participant))
    )
    
    result = await db.execute(query)
    votes = result.scalars().all()
    
    positions = []
    for vote in votes:
        # Only include votes that have Feasibility and Business Value scores (matrix positions)
        if (vote.scores and 
            'Feasibility' in vote.scores and 
            'Business Value' in vote.scores):
            
            use_case = vote.use_case
            participant = vote.participant
            
            positions.append(AllParticipantMatrixPosition(
                use_case_id=str(use_case.id),
                use_case_title=use_case.title,
                participant_id=str(vote.participant_id),
                participant_name=participant.display_name if participant else 'Unknown',
                x=float(vote.scores['Feasibility']),
                y=float(vote.scores['Business Value']),
                scores={
                    'Feasibility': float(vote.scores['Feasibility']),
                    'Business Value': float(vote.scores['Business Value'])
                }
            ))
    
    return positions


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vote(
    use_case_id: str,
    participant_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        use_case_uuid = UUID(use_case_id)
        participant_uuid = UUID(participant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Use execute/scalars for delete to ensure we can get the necessary info for socket event if needed
    # Or just select then delete
    
    # Check if exists
    result = await db.execute(
        select(Vote).where(
            Vote.use_case_id == use_case_uuid,
            Vote.participant_id == participant_uuid
        )
    )
    vote = result.scalars().first()
    
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")

    # Get use case info for socket event
    use_case_res = await db.execute(select(UseCase).where(UseCase.id == use_case_uuid))
    use_case = use_case_res.scalars().first()
    
    # Get participant info for socket event
    participant_res = await db.execute(select(Participant).where(Participant.id == participant_uuid))
    participant = participant_res.scalars().first()

    # Delete
    await db.delete(vote)
    await db.commit()
    
    # Emit socket event so clients update
    if use_case:
        # Update vote count
        votes_res = await db.execute(select(Vote).where(Vote.use_case_id == use_case_uuid))
        count = len(votes_res.scalars().all())
        
        await sio.emit(
            'vote_update', 
            {'use_case_id': str(use_case.id), 'count': count}, 
            room=str(use_case.workshop_id)
        )
        
        # Emit matrix removal
        if participant:
            await sio.emit(
                'matrix:position_removed',
                {
                    'participant_id': str(participant.id),
                    'use_case_id': str(use_case.id),
                    'workshop_id': str(use_case.workshop_id)
                },
                room=str(use_case.workshop_id)
            )

    return None
