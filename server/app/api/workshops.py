from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models import Workshop, User
from app.schemas.workshop import WorkshopCreate, WorkshopResponse
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
    db: AsyncSession = Depends(get_db)
):
    # TODO: Get actual current user from Auth context. For now, creating a dummy user or failing if none exists.
    # For MVP Sprint 1, we will mock a user ID or create one on the fly for demonstration if Auth isn't fully ready.
    # Let's verify if we have a user.
    
    # Check for at least one user to assign as facilitator
    result = await db.execute(select(User))
    user = result.scalars().first()
    
    if not user:
        # Create a default admin user for Sprint 1 dev
        user = User(email="admin@example.com", password_hash="dummy", full_name="Admin")
        db.add(user)
        await db.commit()
        await db.refresh(user)

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
    return workshop

# Import socket manager
from app.core.socket_manager import sio
from app.schemas.workshop_actions import PhaseUpdate

@router.post("/{workshop_id}/phase", response_model=WorkshopResponse)
async def update_phase(
    workshop_id: str,
    phase_in: PhaseUpdate,
    db: AsyncSession = Depends(get_db)
):
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
    db: AsyncSession = Depends(get_db)
):
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
