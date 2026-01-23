from fastapi import APIRouter, Depends,status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import UseCase, Participant, Workshop
from app.schemas.usecase import UseCaseCreate, UseCaseResponse
from app.core.socket_manager import sio # Import socket server
from typing import List

router = APIRouter()

@router.post("/", response_model=UseCaseResponse, status_code=status.HTTP_201_CREATED)
async def submit_use_case(
    uc_in: UseCaseCreate,
    db: AsyncSession = Depends(get_db)
):
    # Verify participant/workshop existence (skipped for brevity/speed)
    
    use_case = UseCase(
        title=uc_in.title,
        description=uc_in.description,
        proposed_solution=uc_in.proposed_solution,
        kpi=uc_in.kpi,
        target_user=uc_in.target_user,
        category=uc_in.category,
        participant_id=uc_in.participant_id,
        workshop_id=uc_in.workshop_id
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
