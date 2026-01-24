from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models import Workshop, User, Participant, ParticipantRole
from app.schemas.workshop import WorkshopCreate, WorkshopResponse, PendingFacilitator
from app.api.auth import get_current_user, oauth2_scheme
from typing import Optional
import random
import string

router = APIRouter()

def generate_pin(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

from typing import List

@router.get("/", response_model=List[WorkshopResponse])
async def list_workshops(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workshop).order_by(Workshop.title))
    return result.scalars().all()

@router.post("/", response_model=WorkshopResponse, status_code=status.HTTP_201_CREATED)
async def create_workshop(
    workshop_in: WorkshopCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new workshop. Requires authentication."""
    user = current_user

    pin = generate_pin()
    
    db_workshop = Workshop(
        title=workshop_in.title,
        config=workshop_in.config.model_dump(),
        facilitator_id=user.id,
        pin=pin
    )
    
    db.add(db_workshop)
    await db.commit()
    await db.refresh(db_workshop)
    
    return db_workshop

@router.get("/{workshop_id}", response_model=WorkshopResponse)
async def get_workshop(workshop_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
        
    # Fetch pending facilitators
    pf_result = await db.execute(
        select(Participant)
        .where(Participant.workshop_id == workshop_id)
        .where(Participant.role == ParticipantRole.PENDING_FACILITATOR)
    )
    pending_list = pf_result.scalars().all()
    
    # Map to schema
    response = WorkshopResponse.model_validate(workshop)
    response.pending_facilitators = [
        PendingFacilitator(participant_id=p.id, display_name=p.display_name) 
        for p in pending_list
    ]
    
    return response

# Import socket manager
from app.core.socket_manager import sio
from app.schemas.workshop_actions import PhaseUpdate

@router.post("/{workshop_id}/phase", response_model=WorkshopResponse)
async def update_phase(
    workshop_id: str,
    phase_in: PhaseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update workshop phase. Requires authentication (facilitator only)."""
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")

    workshop.current_phase = phase_in.phase
    await db.commit()
    await db.refresh(workshop)
    
    # Broadcast state change
    await sio.emit('workshop_state_change', {'phase': workshop.current_phase}, room=str(workshop.id))
    
    return workshop

from app.schemas.workshop_actions import ActivateCard
from app.models.models import UseCase

@router.post("/{workshop_id}/active_card", response_model=WorkshopResponse)
async def set_active_card(
    workshop_id: str,
    action: ActivateCard,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Set active use case card. Requires authentication (facilitator only)."""
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")

    workshop.active_use_case_id = action.use_case_id
    await db.commit()
    await db.refresh(workshop)
    
    # Broadcast Active Card Update
    active_card_data = None
    if action.use_case_id:
        uc_res = await db.execute(select(UseCase).where(UseCase.id == action.use_case_id))
        uc = uc_res.scalars().first()
        if uc:
            active_card_data = {
                'id': str(uc.id),
                'title': uc.title,
                'description': uc.description,
                'proposed_solution': uc.proposed_solution
            }

    await sio.emit(
        'active_card_update', 
        {'active_card': active_card_data}, 
        room=str(workshop.id)
    )
    
    return workshop
