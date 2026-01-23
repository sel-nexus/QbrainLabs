from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import Workshop, Participant, WorkshopStatus
from app.schemas.participant import JoinRequest, JoinResponse

router = APIRouter()

@router.post("/join", response_model=JoinResponse)
async def join_workshop(
    join_in: JoinRequest,
    db: AsyncSession = Depends(get_db)
):
    # Lookup workshop by PIN
    result = await db.execute(select(Workshop).where(Workshop.pin == join_in.pin))
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found. Check the PIN.")
        
    if workshop.status == WorkshopStatus.COMPLETED or workshop.status == WorkshopStatus.DRAFT:
         # For MVP allow DRAFT joining for testing, but typically only OPEN/IN_PROGRESS
         pass
         
    # Create Participant
    participant = Participant(
        workshop_id=workshop.id,
        display_name=join_in.display_name
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    return JoinResponse(
        participant_id=participant.id,
        workshop_id=workshop.id,
        workshop_title=workshop.title,
        workshop_status=workshop.status
    )
