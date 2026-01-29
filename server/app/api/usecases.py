from fastapi import APIRouter, Depends, status, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from app.core.database import get_db
from app.models.models import UseCase, Participant, Workshop, UseCaseFeedback
from app.schemas.usecase import UseCaseCreate, UseCaseResponse
from app.core.socket_manager import sio # Import socket server
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=UseCaseResponse, status_code=status.HTTP_201_CREATED)
async def submit_use_case(
    uc_in: UseCaseCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify workshop existence
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == uc_in.workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    use_case = UseCase(
        title=uc_in.title,
        description=uc_in.description,
        proposed_solution=uc_in.proposed_solution,
        kpi=uc_in.kpi,
        target_user=uc_in.target_user,
        category=uc_in.category,
        participant_id=uc_in.participant_id,  # Can be None for facilitator-added use cases
        workshop_id=uc_in.workshop_id,
        added_by_facilitator=uc_in.added_by_facilitator or (uc_in.participant_id is None)
    )
    
    db.add(use_case)
    await db.commit()
    await db.refresh(use_case)
    
    # Broadcast to Workshop Room (Facilitator will listen)
    await sio.emit(
        'new_submission', 
        {
            'id': str(use_case.id), 
            'title': use_case.title, 
            'description': use_case.description
        }, 
        room=str(uc_in.workshop_id)
    )
    
    return use_case

@router.get("/{workshop_id}", response_model=List[UseCaseResponse])
async def get_workshop_use_cases(workshop_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UseCase).where(UseCase.workshop_id == workshop_id).order_by(UseCase.title)
    )
    return result.scalars().all()


@router.put("/{usecase_id}")
async def update_use_case(
    usecase_id: str,
    title: str = Body(...),
    description: str = Body(...),
    proposed_solution: Optional[str] = Body(None),
    kpi: Optional[str] = Body(None),
    target_user: Optional[str] = Body(None),
    category: Optional[str] = Body(None),
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Update a use case (only by owner)"""
    result = await db.execute(select(UseCase).where(UseCase.id == usecase_id))
    use_case = result.scalar_one_or_none()
    
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Verify ownership
    if str(use_case.participant_id) != participant_id:
        raise HTTPException(status_code=403, detail="You can only edit your own use cases")
    
    # Update fields
    use_case.title = title
    use_case.description = description
    if proposed_solution is not None:
        use_case.proposed_solution = proposed_solution
    if kpi is not None:
        use_case.kpi = kpi
    if target_user is not None:
        use_case.target_user = target_user
    if category is not None:
        use_case.category = category
    
    await db.commit()
    await db.refresh(use_case)
    
    return {
        "id": str(use_case.id),
        "title": use_case.title,
        "description": use_case.description,
        "proposed_solution": use_case.proposed_solution,
        "kpi": use_case.kpi,
        "target_user": use_case.target_user,
        "category": use_case.category
    }


@router.post("/{usecase_id}/feedback")
async def submit_usecase_feedback(
    usecase_id: str,
    feedback_text: str = Body(..., embed=True),
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Submit feedback on a use case"""
    # Verify use case exists
    result = await db.execute(select(UseCase).where(UseCase.id == usecase_id))
    use_case = result.scalar_one_or_none()
    
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Verify participant exists and belongs to same workshop
    result = await db.execute(
        select(Participant).where(
            and_(
                Participant.id == participant_id,
                Participant.workshop_id == use_case.workshop_id
            )
        )
    )
    participant = result.scalar_one_or_none()
    
    if not participant:
        raise HTTPException(status_code=403, detail="Participant not found in this workshop")
    
    # Prevent feedback on own use case
    if str(use_case.participant_id) == participant_id:
        raise HTTPException(status_code=400, detail="You cannot provide feedback on your own use case")
    
    # Check if feedback already exists (update instead of create)
    result = await db.execute(
        select(UseCaseFeedback).where(
            and_(
                UseCaseFeedback.usecase_id == usecase_id,
                UseCaseFeedback.participant_id == participant_id
            )
        )
    )
    existing_feedback = result.scalar_one_or_none()
    
    if existing_feedback:
        # Update existing feedback
        existing_feedback.feedback_text = feedback_text
        existing_feedback.updated_at = datetime.utcnow()
    else:
        # Create new feedback
        feedback = UseCaseFeedback(
            id=uuid.uuid4(),
            usecase_id=uuid.UUID(usecase_id),
            participant_id=uuid.UUID(participant_id),
            feedback_text=feedback_text
        )
        db.add(feedback)
    
    await db.commit()
    
    return {"success": True, "message": "Feedback submitted successfully"}


@router.get("/{usecase_id}/feedback")
async def get_usecase_feedback(
    usecase_id: str,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback for a use case from a specific participant"""
    result = await db.execute(
        select(UseCaseFeedback).where(
            and_(
                UseCaseFeedback.usecase_id == usecase_id,
                UseCaseFeedback.participant_id == participant_id
            )
        )
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {
        "id": str(feedback.id),
        "feedback_text": feedback.feedback_text,
        "created_at": feedback.created_at,
        "updated_at": feedback.updated_at
    }
