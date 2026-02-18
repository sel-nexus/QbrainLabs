from fastapi import APIRouter, Depends, status, HTTPException, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from app.core.database import get_db
from app.models.models import UseCase, Participant, Workshop, UseCaseFeedback, User
from app.api.auth import get_current_user_optional
from app.schemas.usecase import UseCaseCreate, UseCaseResponse, UseCaseUpdate
from app.core.socket_manager import sio # Import socket server
from typing import List, Optional
from pydantic import BaseModel
import uuid
from datetime import datetime

router = APIRouter()

# Helper to verify workshop ownership for facilitators
async def verify_workshop_access(workshop_id: uuid.UUID, user: User, db: AsyncSession) -> bool:
    if user.is_admin_user:
        return True
    
    # Check if user is the facilitator of the workshop
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    
    if workshop and str(workshop.facilitator_id) == str(user.id):
        return True
        
    return False

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
    
    # Award points for submission
    if uc_in.participant_id:
        try:
            from app.api.gamification import service_award_points
            await service_award_points(
                participant_id=str(uc_in.participant_id),
                workshop_id=str(uc_in.workshop_id),
                action="submit_use_case",
                db=db
            )
        except Exception as e:
            print(f"Error awarding points: {e}")
    
    return use_case

@router.get("/all/list", response_model=List[dict])
async def get_all_use_cases(
    authenticated_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Get all use cases with their workshop information
    - Admins see all use cases
    - Facilitators only see use cases from workshops they own or are assigned to
    """
    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Admins can see all use cases
    if authenticated_user.is_admin_user:
        result = await db.execute(
            select(UseCase, Workshop)
            .join(Workshop, UseCase.workshop_id == Workshop.id)
            .order_by(UseCase.created_at.desc())
        )
    else:
        # Facilitators only see use cases from their workshops
        from app.models.rbac import WorkshopFacilitator
        
        # Get workshops owned by the facilitator
        owned_workshops_result = await db.execute(
            select(Workshop.id).where(Workshop.facilitator_id == authenticated_user.id)
        )
        owned_workshop_ids = [str(w[0]) for w in owned_workshops_result.all()]
        
        # Get workshops assigned to the facilitator
        assigned_workshops_result = await db.execute(
            select(WorkshopFacilitator.workshop_id)
            .where(WorkshopFacilitator.facilitator_id == authenticated_user.id)
        )
        assigned_workshop_ids = [str(w[0]) for w in assigned_workshops_result.all()]
        
        # Combine both lists
        all_workshop_ids = list(set(owned_workshop_ids + assigned_workshop_ids))
        
        if not all_workshop_ids:
            # Facilitator has no workshops, return empty list
            return []
        
        # Get use cases only from facilitator's workshops
        result = await db.execute(
            select(UseCase, Workshop)
            .join(Workshop, UseCase.workshop_id == Workshop.id)
            .where(UseCase.workshop_id.in_(all_workshop_ids))
            .order_by(UseCase.created_at.desc())
        )
    
    use_cases_data = []
    for use_case, workshop in result.all():
        use_cases_data.append({
            "id": str(use_case.id),
            "title": use_case.title,
            "description": use_case.description,
            "proposed_solution": use_case.proposed_solution,
            "kpi": use_case.kpi,
            "target_user": use_case.target_user,
            "category": use_case.category,
            "status": use_case.status,
            "created_at": use_case.created_at.isoformat() if use_case.created_at else None,
            "workshop": {
                "id": str(workshop.id),
                "title": workshop.title,
                "status": workshop.status,
                "current_phase": workshop.current_phase
            }
        })
    
    return use_cases_data

@router.get("/{workshop_id}", response_model=List[UseCaseResponse])
async def get_workshop_use_cases(workshop_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UseCase).where(UseCase.workshop_id == workshop_id).order_by(UseCase.title)
    )
    return result.scalars().all()


@router.put("/{usecase_id}")
async def update_use_case(
    usecase_id: str,
    update_data: UseCaseUpdate,
    participant_id: Optional[str] = Query(None),
    authenticated_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Update a use case (by owner or workshop facilitator/admin)"""
    result = await db.execute(select(UseCase).where(UseCase.id == usecase_id))
    use_case = result.scalar_one_or_none()
    
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Authorization Check
    is_authorized = False
    
    # 1. Check if user is the participant owner
    if participant_id and str(use_case.participant_id) == participant_id:
        is_authorized = True
        
    # 2. Check if user is Admin or Workshop Facilitator
    if not is_authorized and authenticated_user:
        if await verify_workshop_access(use_case.workshop_id, authenticated_user, db):
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to edit this use case")
    
    # Update fields from schema
    use_case.title = update_data.title
    use_case.description = update_data.description
    if update_data.proposed_solution is not None:
        use_case.proposed_solution = update_data.proposed_solution
    if update_data.kpi is not None:
        use_case.kpi = update_data.kpi
    if update_data.target_user is not None:
        use_case.target_user = update_data.target_user
    if update_data.category is not None:
        use_case.category = update_data.category
    
    await db.commit()
    await db.refresh(use_case)

    # Broadcast update
    await sio.emit(
        'use_case_updated', 
        {
            'id': str(use_case.id),
            'title': use_case.title,
            'description': use_case.description,
            'proposed_solution': use_case.proposed_solution
        },
        room=str(use_case.workshop_id)
    )
    
    return {
        "id": str(use_case.id),
        "title": use_case.title,
        "description": use_case.description,
        "proposed_solution": use_case.proposed_solution,
        "kpi": use_case.kpi,
        "target_user": use_case.target_user,
        "category": use_case.category
    }

@router.delete("/{usecase_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_use_case(
    usecase_id: str,
    participant_id: Optional[str] = Query(None),
    authenticated_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Delete a use case"""
    from app.models.models import Vote
    
    result = await db.execute(select(UseCase).where(UseCase.id == usecase_id))
    use_case = result.scalar_one_or_none()
    
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")
        
    # Authorization Check
    is_authorized = False
    
    # 1. Check if user is the participant owner
    if participant_id and str(use_case.participant_id) == participant_id:
        is_authorized = True
        
    # 2. Check if user is Admin or Workshop Facilitator
    if not is_authorized and authenticated_user:
        if await verify_workshop_access(use_case.workshop_id, authenticated_user, db):
            is_authorized = True
            
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Not authorized to delete this use case")
    
    # Store values before deletion for socket broadcast
    use_case_id_str = str(use_case.id)
    workshop_id_str = str(use_case.workshop_id)
    
    try:
        # 1. Clear active_use_case_id from workshop if it references this use case
        workshop_result = await db.execute(
            select(Workshop).where(Workshop.active_use_case_id == use_case.id)
        )
        workshop = workshop_result.scalar_one_or_none()
        if workshop:
            workshop.active_use_case_id = None
            
        # 2. Delete related votes
        await db.execute(
            Vote.__table__.delete().where(Vote.use_case_id == use_case.id)
        )
        
        # 3. Delete related feedback (UseCaseFeedback has ondelete CASCADE but let's be explicit)
        from app.models.models import UseCaseFeedback
        await db.execute(
            UseCaseFeedback.__table__.delete().where(UseCaseFeedback.usecase_id == use_case.id)
        )
        
        # 4. Delete related ROI calculations and business cases
        try:
            from app.models.roi import ROICalculation, BusinessCase
            # First delete business cases (they reference ROI calculations)
            await db.execute(
                BusinessCase.__table__.delete().where(BusinessCase.use_case_id == use_case.id)
            )
            # Then delete ROI calculations
            await db.execute(
                ROICalculation.__table__.delete().where(ROICalculation.use_case_id == use_case.id)
            )
        except Exception:
            pass  # ROI might not be set up
        
        # 5. Delete related RAG feedback (nullable FK, so set to NULL or delete)
        try:
            from app.models.rag_feedback import RAGFeedback
            await db.execute(
                RAGFeedback.__table__.delete().where(RAGFeedback.use_case_id == str(use_case.id))
            )
        except Exception:
            pass  # RAG feedback might not be set up
        
        # 6. Clear use_case_id from roadmap items (nullable FK)
        try:
            from app.models.roadmap import RoadmapItem
            from sqlalchemy import update
            await db.execute(
                update(RoadmapItem).where(RoadmapItem.use_case_id == use_case.id).values(use_case_id=None)
            )
        except Exception:
            pass  # Roadmap might not be set up
        
        # 7. Now delete the use case
        await db.delete(use_case)
        await db.commit()
        
        # Broadcast deletion AFTER successful deletion
        await sio.emit(
            'use_case_deleted', 
            {'id': use_case_id_str}, 
            room=workshop_id_str
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete use case: {str(e)}")
    
    return None


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


class UseCaseStatusUpdate(BaseModel):
    status: str  # "APPROVED" or "REJECTED"


@router.patch("/{usecase_id}/status")
async def update_use_case_status(
    usecase_id: str,
    status_update: UseCaseStatusUpdate,
    authenticated_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Approve or reject a use case (facilitator/admin only)"""
    if status_update.status not in ("APPROVED", "REJECTED", "PENDING"):
        raise HTTPException(status_code=400, detail="Status must be APPROVED, REJECTED, or PENDING")

    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    result = await db.execute(select(UseCase).where(UseCase.id == usecase_id))
    use_case = result.scalar_one_or_none()

    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")

    if not await verify_workshop_access(use_case.workshop_id, authenticated_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to change the status of this use case")

    use_case.status = status_update.status
    await db.commit()
    await db.refresh(use_case)

    await sio.emit(
        'use_case_status_changed',
        {'id': str(use_case.id), 'status': use_case.status},
        room=str(use_case.workshop_id)
    )

    return {"id": str(use_case.id), "status": use_case.status}
