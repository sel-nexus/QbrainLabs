"""
Challenge Cards API Endpoints (US34)
API endpoints for challenge card CRUD operations and six-step process generation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.models.challenge import ChallengeCard
from app.models.models import Workshop, User
from app.schemas.challenge import (
    ChallengeCardCreate,
    ChallengeCardUpdate,
    ChallengeCardResponse,
    ChallengeCardReorder,
    StepGenerationRequest,
    StepGenerationResponse,
    GenerateAllStepsRequest,
    GenerateAllStepsResponse
)
from app.services.challenge_step_service import ChallengeStepService
from app.api.auth import get_current_user
from app.middleware.rbac import require_facilitator, WorkshopAccessChecker

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


@router.post("/workshops/{workshop_id}/challenges", response_model=ChallengeCardResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge_card(
    workshop_id: UUID,
    challenge_data: ChallengeCardCreate,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(WorkshopAccessChecker(workshop_id_param="workshop_id"))
):
    """Create a new challenge card for a workshop"""
    # Verify workshop exists
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Create challenge card
    challenge_card = ChallengeCard(
        workshop_id=workshop_id,
        title=challenge_data.title,
        challenge_description=challenge_data.challenge_description,
        success_criteria=challenge_data.success_criteria,
        display_order=challenge_data.display_order,
        created_by=current_user.id
    )
    
    db.add(challenge_card)
    await db.commit()
    await db.refresh(challenge_card)
    
    return challenge_card


@router.get("/workshops/{workshop_id}/challenges", response_model=List[ChallengeCardResponse])
async def list_challenge_cards(
    workshop_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """List all challenge cards for a workshop"""
    result = await db.execute(
        select(ChallengeCard)
        .where(ChallengeCard.workshop_id == workshop_id)
        .order_by(ChallengeCard.display_order, ChallengeCard.created_at)
    )
    challenge_cards = result.scalars().all()
    return challenge_cards


@router.get("/{challenge_id}", response_model=ChallengeCardResponse)
async def get_challenge_card(
    challenge_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a single challenge card by ID"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    return challenge_card


@router.put("/{challenge_id}", response_model=ChallengeCardResponse)
async def update_challenge_card(
    challenge_id: UUID,
    challenge_data: ChallengeCardUpdate,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Update a challenge card"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Check access: must be creator, workshop owner, or admin
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == challenge_card.workshop_id)
    )
    workshop = workshop_result.scalars().first()
    
    if (challenge_card.created_by != current_user.id and 
        workshop.facilitator_id != current_user.id and
        not current_user.is_admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this challenge card"
        )
    
    # Update fields
    update_data = challenge_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(challenge_card, field, value)
    
    await db.commit()
    await db.refresh(challenge_card)
    return challenge_card


@router.delete("/{challenge_id}")
async def delete_challenge_card(
    challenge_id: UUID,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Delete a challenge card"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Check access: must be creator, workshop owner, or admin
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == challenge_card.workshop_id)
    )
    workshop = workshop_result.scalars().first()
    
    if (challenge_card.created_by != current_user.id and 
        workshop.facilitator_id != current_user.id and
        not current_user.is_admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this challenge card"
        )
    
    await db.delete(challenge_card)
    await db.commit()
    return {"message": "Challenge card deleted successfully"}


@router.patch("/{challenge_id}/reorder", response_model=ChallengeCardResponse)
async def reorder_challenge_card(
    challenge_id: UUID,
    reorder_data: ChallengeCardReorder,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Update the display order of a challenge card"""
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Check access
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == challenge_card.workshop_id)
    )
    workshop = workshop_result.scalars().first()
    
    if (workshop.facilitator_id != current_user.id and
        not current_user.is_admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to reorder challenge cards"
        )
    
    challenge_card.display_order = reorder_data.display_order
    await db.commit()
    await db.refresh(challenge_card)
    return challenge_card


# Six-Step Process Generation Endpoints
@router.post("/{challenge_id}/steps/{step_number}/generate-prompt", response_model=StepGenerationResponse)
async def generate_step_prompt(
    challenge_id: UUID,
    step_number: int,
    request_data: StepGenerationRequest,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Generate a prompt for a specific step of the six-step process"""
    # Validate step number
    if step_number < 1 or step_number > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step number must be between 1 and 6"
        )
    
    # Get challenge card
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Generate prompt
    service = ChallengeStepService(db)
    prompt = await service.generate_step_prompt(
        challenge_card=challenge_card,
        step_number=step_number,
        include_workshop_context=request_data.include_workshop_context,
        include_previous_steps=request_data.include_previous_steps
    )
    
    return StepGenerationResponse(
        step_number=step_number,
        step_name=service.get_step_name(step_number),
        content=prompt,
        generated_at=datetime.utcnow(),
        format="text"
    )


@router.post("/{challenge_id}/steps/{step_number}/generate-summary", response_model=StepGenerationResponse)
async def generate_step_summary(
    challenge_id: UUID,
    step_number: int,
    request_data: StepGenerationRequest,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Generate a one-slide summary for a specific step"""
    # Validate step number
    if step_number < 1 or step_number > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step number must be between 1 and 6"
        )
    
    # Get challenge card
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Generate summary
    service = ChallengeStepService(db)
    summary = await service.generate_step_summary(
        challenge_card=challenge_card,
        step_number=step_number,
        include_workshop_context=request_data.include_workshop_context,
        include_previous_steps=request_data.include_previous_steps,
        step_content=request_data.step_content,
        format=request_data.format or "markdown"
    )
    
    return StepGenerationResponse(
        step_number=step_number,
        step_name=service.get_step_name(step_number),
        content=summary,
        generated_at=datetime.utcnow(),
        format=request_data.format or "markdown"
    )


@router.post("/{challenge_id}/steps/generate-all", response_model=GenerateAllStepsResponse)
async def generate_all_steps(
    challenge_id: UUID,
    request_data: GenerateAllStepsRequest,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """Generate prompts or summaries for multiple steps at once"""
    # Get challenge card
    result = await db.execute(
        select(ChallengeCard).where(ChallengeCard.id == challenge_id)
    )
    challenge_card = result.scalars().first()
    if not challenge_card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge card not found"
        )
    
    # Generate content for specified steps
    service = ChallengeStepService(db)
    content_type = request_data.type  # "prompt" or "summary"
    steps_to_generate = request_data.steps or [1, 2, 3, 4, 5, 6]
    
    generated_steps = []
    for step_number in steps_to_generate:
        if step_number < 1 or step_number > 6:
            continue
        
        if content_type == "prompt":
            content = await service.generate_step_prompt(
                challenge_card=challenge_card,
                step_number=step_number,
                include_workshop_context=request_data.include_workshop_context,
                include_previous_steps=True  # Include previous steps when generating all
            )
            format_type = "text"
        else:
            content = await service.generate_step_summary(
                challenge_card=challenge_card,
                step_number=step_number,
                include_workshop_context=request_data.include_workshop_context,
                include_previous_steps=True,
                format=request_data.format or "markdown"
            )
            format_type = request_data.format or "markdown"
        
        generated_steps.append(StepGenerationResponse(
            step_number=step_number,
            step_name=service.get_step_name(step_number),
            content=content,
            generated_at=datetime.utcnow(),
            format=format_type
        ))
    
    return GenerateAllStepsResponse(
        challenge_id=challenge_id,
        generated_steps=generated_steps,
        generated_at=datetime.utcnow()
    )
