from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models.poll import (
    Poll, PollType, PollStatus, PollResponse,
    Reaction, Question, QuestionUpvote
)
from app.models.models import Workshop, Participant, User
from app.schemas.poll import (
    PollCreate, PollSchema, PollResponseSchema,
    ReactionCreate, ReactionMetrics,
    QuestionCreate, QuestionSchema, QuestionUpdate,
    PollDetail, PollStats
)
from app.api.auth import get_current_user
from app.core.socket_manager import manager

router = APIRouter(prefix="/polls", tags=["polls"])

# Helper: Verify Facilitator Access
async def verify_facilitator_access(workshop_id: str, user: User, db: AsyncSession) -> Workshop:
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalar_one_or_none()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    if str(workshop.facilitator_id) != str(user.id) and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return workshop

# Helper: Verify Participant Access
async def verify_participant(workshop_id: str, participant_id: str, db: AsyncSession) -> Participant:
    result = await db.execute(
        select(Participant).where(
            and_(Participant.id == participant_id, Participant.workshop_id == workshop_id)
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="Participant not found")
    return participant

# ----------------------------------------------------------------
# Poll Management
# ----------------------------------------------------------------

@router.post("/workshop/{workshop_id}", response_model=PollDetail)
async def create_poll(
    workshop_id: str,
    poll_data: PollCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await verify_facilitator_access(workshop_id, current_user, db)
    
    poll = Poll(
        id=uuid.uuid4(),
        workshop_id=workshop_id,
        question_text=poll_data.question_text,
        poll_type=poll_data.poll_type,
        options=poll_data.options,
        is_anonymous=poll_data.is_anonymous,
        status=PollStatus.ACTIVE # Auto-activate for "Quick Polls" usually
    )
    db.add(poll)
    await db.commit()
    await db.refresh(poll)
    
    # Broadcast
    await manager.broadcast_to_workshop(workshop_id, "poll:created", PollSchema.model_validate(poll).model_dump(mode='json'))
    
    return poll

@router.get("/workshop/{workshop_id}", response_model=List[PollDetail])
async def list_polls(
    workshop_id: str,
    participant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    # Logic: Facilitator gets all, Participant gets Active only (usually) 
    # But for history, maybe all. Let's return all but decorate with user response.
    
    # Use selectinload to eager load responses - fixes N+1 query problem
    from sqlalchemy.orm import selectinload
    
    query = (
        select(Poll)
        .where(Poll.workshop_id == workshop_id)
        .options(selectinload(Poll.responses))  # Eager load responses
        .order_by(Poll.created_at.desc())
    )
    if participant_id:
        # Verify participation
        await verify_participant(workshop_id, participant_id, db)
        # Maybe filter if needed, but showing history is good.
    
    result = await db.execute(query)
    polls = result.scalars().all()
    
    # Calculate stats for each poll
    poll_details = []
    for poll in polls:
        # Responses are already loaded - no additional query needed
        responses = poll.responses
        
        # Aggregation logic based on poll type
        stats_data = {}
        if poll.poll_type in [PollType.MULTIPLE_CHOICE, PollType.YES_NO, PollType.RATING_SCALE]:
            # Simple count
            counts = {}
            for r in responses:
                val = str(r.response_data)
                counts[val] = counts.get(val, 0) + 1
            stats_data = counts
        elif poll.poll_type == PollType.MULTIPLE_SELECT:
             # List of values
            counts = {}
            for r in responses:
                vals = r.response_data if isinstance(r.response_data, list) else [r.response_data]
                for v in vals:
                    sv = str(v)
                    counts[sv] = counts.get(sv, 0) + 1
            stats_data = counts
            
        stats = PollStats(total_responses=len(responses), results=stats_data)
        
        user_resp = None
        if participant_id:
            user_resp_obj = next((r for r in responses if str(r.participant_id) == participant_id), None)
            if user_resp_obj:
                user_resp = user_resp_obj.response_data
                
        poll_details.append(PollDetail(
            **poll.__dict__,
            stats=stats,
            user_response=user_resp
        ))
        
    return poll_details

@router.post("/{poll_id}/vote")
async def vote_poll(
    poll_id: str,
    participant_id: str = Query(...),
    response_data: Any = Body(..., embed=True),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    if poll.status != PollStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Poll is not active")
        
    await verify_participant(str(poll.workshop_id), participant_id, db)
    
    # Check existing vote
    existing = await db.execute(
        select(PollResponse).where(and_(PollResponse.poll_id == poll.id, PollResponse.participant_id == participant_id))
    )
    if existing.scalar_one_or_none():
         raise HTTPException(status_code=400, detail="Already voted")

    vote = PollResponse(
        id=uuid.uuid4(),
        poll_id=poll_id,
        participant_id=participant_id,
        response_data=response_data
    )
    db.add(vote)
    await db.commit()
    
    # Broadcast update (Anonymous to avoid leaking who voted what immediately, just stats)
    # Re-calculate stats for the specific poll to broadcast
    resp_result = await db.execute(select(PollResponse).where(PollResponse.poll_id == poll_id))
    responses = resp_result.scalars().all()
    
    # Simple re-calc (could be optimized)
    stats_data = {}
    if poll.poll_type in [PollType.MULTIPLE_CHOICE, PollType.YES_NO, PollType.RATING_SCALE]:
        counts = {}
        for r in responses:
            val = str(r.response_data)
            counts[val] = counts.get(val, 0) + 1
        stats_data = counts
        
    broadcast_payload = {
        "poll_id": poll_id,
        "total_responses": len(responses),
        "results": stats_data
    }
    await manager.broadcast_to_workshop(str(poll.workshop_id), "poll:vote", broadcast_payload)
    
    return {"success": True}

@router.put("/{poll_id}/status")
async def update_poll_status(
    poll_id: str,
    status: PollStatus = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Poll).where(Poll.id == poll_id))
    poll = result.scalar_one_or_none()
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
        
    await verify_facilitator_access(str(poll.workshop_id), current_user, db)
    
    poll.status = status
    await db.commit()
    
    await manager.broadcast_to_workshop(str(poll.workshop_id), "poll:status", {"poll_id": poll_id, "status": status})
    return poll

# ----------------------------------------------------------------
# Reactions
# ----------------------------------------------------------------

@router.post("/workshop/{workshop_id}/reactions")
async def send_reaction(
    workshop_id: str,
    reaction: ReactionCreate,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    await verify_participant(workshop_id, participant_id, db)
    
    # Ideally, we just broadcast this transiently for animation
    # But storing allows heatmap analysis later
    # To prevent DB flood, we might debounce or just store specific events
    # For MVP, we store all.
    
    react_obj = Reaction(
        id=uuid.uuid4(),
        workshop_id=workshop_id,
        participant_id=participant_id,
        reaction_type=reaction.reaction_type
    )
    db.add(react_obj)
    await db.commit()
    
    # Broadcast immediately for animation
    await manager.broadcast_to_workshop(workshop_id, "reaction:sent", {
        "reaction_type": reaction.reaction_type,
        "participant_id": participant_id # Optional: include or hide
    })
    
    return {"success": True}

@router.get("/workshop/{workshop_id}/reactions/summary")
async def get_reaction_summary(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    # Aggregation
    result = await db.execute(
        select(Reaction.reaction_type, func.count(Reaction.id))
        .where(Reaction.workshop_id == workshop_id)
        .group_by(Reaction.reaction_type)
    )
    counts = {row[0]: row[1] for row in result.all()}
    return {"counts": counts}

# ----------------------------------------------------------------
# Q&A
# ----------------------------------------------------------------

@router.post("/workshop/{workshop_id}/questions", response_model=QuestionSchema)
async def submit_question(
    workshop_id: str,
    question_data: QuestionCreate,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    participant = await verify_participant(workshop_id, participant_id, db)
    
    q = Question(
        id=uuid.uuid4(),
        workshop_id=workshop_id,
        participant_id=participant_id,
        content=question_data.content,
        is_anonymous=question_data.is_anonymous
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    
    # Construct schema
    display_name = "Anonymous" if q.is_anonymous else participant.display_name
    
    resp = QuestionSchema(
        id=str(q.id),
        workshop_id=str(q.workshop_id),
        participant_id=str(q.participant_id),
        display_name=display_name,
        content=q.content,
        is_answered=q.is_answered,
        is_pinned=q.is_pinned,
        is_anonymous=q.is_anonymous,
        created_at=q.created_at,
        upvote_count=0,
        user_has_upvoted=False
    )
    
    await manager.broadcast_to_workshop(workshop_id, "question:submitted", resp.model_dump(mode='json'))
    return resp

@router.get("/workshop/{workshop_id}/questions", response_model=List[QuestionSchema])
async def list_questions(
    workshop_id: str,
    participant_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    # Get all questions
    result = await db.execute(
        select(Question)
        .options(selectinload(Question.participant)) # to get display name
        .where(Question.workshop_id == workshop_id)
        .order_by(Question.created_at.desc())
    )
    questions = result.scalars().all()
    
    # Get upvotes
    q_ids = [q.id for q in questions]
    upvotes_res = await db.execute(
        select(QuestionUpvote.question_id, func.count(QuestionUpvote.id))
        .where(QuestionUpvote.question_id.in_(q_ids))
        .group_by(QuestionUpvote.question_id)
    )
    upvote_counts = {row[0]: row[1] for row in upvotes_res.all()}
    
    user_upvotes = set()
    if participant_id:
        user_upvotes_res = await db.execute(
            select(QuestionUpvote.question_id)
            .where(
                and_(
                    QuestionUpvote.participant_id == participant_id,
                    QuestionUpvote.question_id.in_(q_ids)
                )
            )
        )
        user_upvotes = {row[0] for row in user_upvotes_res.all()}
        
    output = []
    for q in questions:
        display_name = "Anonymous" if q.is_anonymous else (q.participant.display_name if q.participant else "Unknown")
        output.append(QuestionSchema(
            id=str(q.id),
            workshop_id=str(q.workshop_id),
            participant_id=str(q.participant_id),
            display_name=display_name,
            content=q.content,
            is_answered=q.is_answered,
            is_pinned=q.is_pinned,
            is_anonymous=q.is_anonymous,
            created_at=q.created_at,
            upvote_count=upvote_counts.get(q.id, 0),
            user_has_upvoted=q.id in user_upvotes
        ))
    
    return output

@router.post("/questions/{question_id}/upvote")
async def upvote_question(
    question_id: str,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    await verify_participant(str(question.workshop_id), participant_id, db)
    
    # Toggle upvote
    existing = await db.execute(
        select(QuestionUpvote).where(
            and_(
                QuestionUpvote.question_id == question_id,
                QuestionUpvote.participant_id == participant_id
            )
        )
    )
    existing_obj = existing.scalar_one_or_none()
    
    if existing_obj:
        await db.delete(existing_obj)
        action = "removed"
    else:
        new_vote = QuestionUpvote(
            id=uuid.uuid4(),
            question_id=question_id,
            participant_id=participant_id
        )
        db.add(new_vote)
        action = "added"
        
    await db.commit()
    
    # Get new count
    count_res = await db.execute(
        select(func.count(QuestionUpvote.id)).where(QuestionUpvote.question_id == question_id)
    )
    count = count_res.scalar_one()
    
    await manager.broadcast_to_workshop(str(question.workshop_id), "question:upvoted", {
        "question_id": question_id,
        "votes": count
    })
    
    return {"success": True, "action": action, "count": count}

@router.put("/questions/{question_id}")
async def update_question(
    question_id: str,
    update_data: QuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    await verify_facilitator_access(str(question.workshop_id), current_user, db)
    
    if update_data.is_answered is not None:
        question.is_answered = update_data.is_answered
    if update_data.is_pinned is not None:
        question.is_pinned = update_data.is_pinned
        
    await db.commit()
    
    await manager.broadcast_to_workshop(str(question.workshop_id), "question:updated", {
        "question_id": question_id,
        "is_answered": question.is_answered,
        "is_pinned": question.is_pinned
    })
    
    return question
