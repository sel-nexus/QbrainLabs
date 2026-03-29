from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models.models import Vote, UseCase, Participant, Workshop
from app.schemas.vote import VoteSubmit, VoteResponse
from app.utils.matrix import calculate_matrix_position, detect_scale_max
from app.core.socket_manager import sio 
from uuid import UUID
from typing import List, Optional
from pydantic import BaseModel
import hashlib

router = APIRouter()

class ParticipantMatrixPosition(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    x: Optional[float] = 0
    y: Optional[float] = 0
    scores: dict
    vote_count: int = 1
    variance: float = 0
    color: Optional[str] = "#8B5CF6"

def get_participant_color(participant_id: str) -> str:
    """Returns a deterministic color hex for a participant ID."""
    colors = [
        "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", 
        "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
    ]
    hash_val = int(hashlib.md5(participant_id.encode()).hexdigest(), 16)
    return colors[hash_val % len(colors)]

@router.post("/", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def submit_vote(
    vote_in: VoteSubmit,
    db: AsyncSession = Depends(get_db)
):
    existing = await db.execute(
        select(Vote).where(
            Vote.use_case_id == vote_in.use_case_id,
            Vote.participant_id == vote_in.participant_id
        )
    )
    existing_vote = existing.scalars().first()
    
    previous_position = None
    if existing_vote and existing_vote.scores and 'Feasibility' in existing_vote.scores and 'Business Value' in existing_vote.scores:
        previous_position = {
            'x': existing_vote.scores.get('Feasibility', 0),
            'y': existing_vote.scores.get('Business Value', 0)
        }
    
    if existing_vote:
        import copy
        new_scores = copy.deepcopy(existing_vote.scores) if existing_vote.scores else {}
        new_scores.update(vote_in.scores)
        existing_vote.scores = new_scores
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
    
    # Award points only for new votes
    if not existing_vote:
        try:
            from app.api.gamification import service_award_points
            if db_vote.use_case and db_vote.use_case.workshop_id:
                # Need to fetch workshop_id if not loaded
                pass 
            # We need workshop id. It wasn't passed directly in VoteSubmit but it's on use_case or we can look it up
            # Actually use_case_id is in input.
            
            # Fetch workshop id from use case
            use_case_res_pts = await db.execute(select(UseCase).where(UseCase.id == vote_in.use_case_id))
            uc_pts = use_case_res_pts.scalars().first()
            
            if uc_pts:
                 await service_award_points(
                    participant_id=str(vote_in.participant_id),
                    workshop_id=str(uc_pts.workshop_id),
                    action="vote",
                    db=db
                )
        except Exception as e:
            print(f"Error awarding vote points: {e}")
    
    use_case_res = await db.execute(select(UseCase).where(UseCase.id == vote_in.use_case_id))
    use_case = use_case_res.scalars().first()
    
    if use_case:
        votes_res = await db.execute(select(Vote).where(Vote.use_case_id == use_case.id))
        count = len(votes_res.scalars().all())
        
        await sio.emit(
            'vote_update', 
            {'use_case_id': str(use_case.id), 'count': count}, 
            room=str(use_case.workshop_id)
        )
        
    if db_vote.scores:
        participant_res = await db.execute(select(Participant).where(Participant.id == vote_in.participant_id))
        participant = participant_res.scalars().first()
        
        ws_template_id = None
        if use_case:
            workshop_res = await db.execute(select(Workshop).where(Workshop.id == use_case.workshop_id))
            workshop = workshop_res.scalars().first()
            if workshop:
                ws_template_id = workshop.config.get('template_id')

        # Detect scale from current vote scores
        scale_max = detect_scale_max([float(v) for v in db_vote.scores.values()])
        x, y = calculate_matrix_position(db_vote.scores, ws_template_id, scale_max)

        p_color = get_participant_color(str(vote_in.participant_id))
        
        event_data = {
            'participant_id': str(vote_in.participant_id),
            'participant_name': participant.display_name if participant else 'Participant',
            'participant_color': p_color,
            'use_case_id': str(use_case.id),
            'use_case_title': use_case.title,
            'scores': db_vote.scores,
            'position': {'x': x or 0, 'y': y or 0},
            'previous_position': previous_position
        }
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
    
    if workshop_id:
        try:
            workshop_uuid = UUID(workshop_id)
            query = query.where(UseCase.workshop_id == workshop_uuid)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid workshop ID format")
    
    result = await db.execute(query)
    votes = result.scalars().all()
    
    ws_template_id = None
    if workshop_id:
        try:
            workshop_res = await db.execute(select(Workshop).where(Workshop.id == UUID(workshop_id)))
            workshop = workshop_res.scalars().first()
            if workshop:
                ws_template_id = workshop.config.get('template_id')
        except ValueError:
            pass
    
    p_color = get_participant_color(participant_id)
    
    positions = []
    for vote in votes:
        if vote.scores:
            use_case = vote.use_case
            scale_max = detect_scale_max([float(v) for v in vote.scores.values()])
            x, y = calculate_matrix_position(vote.scores, ws_template_id, scale_max)
            
            positions.append(ParticipantMatrixPosition(
                id=str(use_case.id),
                title=use_case.title,
                description=use_case.description,
                category=use_case.category,
                x=x or 0,
                y=y or 0,
                scores=vote.scores,
                vote_count=1,
                variance=0,
                color=p_color
            ))
    
    return positions

class AllParticipantMatrixPosition(BaseModel):
    use_case_id: str
    use_case_title: str
    participant_id: str
    participant_name: str
    participant_color: Optional[str] = "#8B5CF6"
    x: float
    y: float
    scores: dict

@router.get("/workshop/{workshop_id}/all-matrix-positions", response_model=List[AllParticipantMatrixPosition])
async def get_all_participant_matrix_positions(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        workshop_uuid = UUID(workshop_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workshop ID format")
    
    query = (
        select(Vote)
        .join(UseCase, Vote.use_case_id == UseCase.id)
        .join(Participant, Vote.participant_id == Participant.id)
        .where(UseCase.workshop_id == workshop_uuid)
        .options(selectinload(Vote.use_case), selectinload(Vote.participant))
    )
    
    result = await db.execute(query)
    votes = result.scalars().all()
    
    ws_template_id = None
    workshop_res = await db.execute(select(Workshop).where(Workshop.id == workshop_uuid))
    workshop = workshop_res.scalars().first()
    if workshop:
        ws_template_id = workshop.config.get('template_id')

    positions = []
    for vote in votes:
        if vote.scores:
            use_case = vote.use_case
            participant = vote.participant
            scale_max = detect_scale_max([float(v) for v in vote.scores.values()])
            x, y = calculate_matrix_position(vote.scores, ws_template_id, scale_max)
            
            positions.append(AllParticipantMatrixPosition(
                use_case_id=str(use_case.id),
                use_case_title=use_case.title,
                participant_id=str(vote.participant_id),
                participant_name=participant.display_name if participant else 'Unknown',
                participant_color=get_participant_color(str(vote.participant_id)),
                x=float(x or 0),
                y=float(y or 0),
                scores=vote.scores
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

    result = await db.execute(
        select(Vote).where(
            Vote.use_case_id == use_case_uuid,
            Vote.participant_id == participant_uuid
        )
    )
    vote = result.scalars().first()
    
    if not vote:
        raise HTTPException(status_code=404, detail="Vote not found")

    use_case_res = await db.execute(select(UseCase).where(UseCase.id == use_case_uuid))
    use_case = use_case_res.scalars().first()
    participant_res = await db.execute(select(Participant).where(Participant.id == participant_uuid))
    participant = participant_res.scalars().first()

    await db.delete(vote)
    await db.commit()
    
    if use_case:
        votes_res = await db.execute(select(Vote).where(Vote.use_case_id == use_case_uuid))
        count = len(votes_res.scalars().all())
        
        await sio.emit(
            'vote_update', 
            {'use_case_id': str(use_case.id), 'count': count}, 
            room=str(use_case.workshop_id)
        )
        
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
