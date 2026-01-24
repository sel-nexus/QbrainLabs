from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import Workshop, Participant, WorkshopStatus, ParticipantRole
from app.schemas.participant import JoinRequest, JoinResponse
from app.core.socket_manager import sio

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
        
    if workshop.status == WorkshopStatus.COMPLETED:
         pass # Allow re-joining completed for review?
         
    # Determine Role
    role = ParticipantRole.PARTICIPANT
    if join_in.role == "FACILITATOR":
        role = ParticipantRole.PENDING_FACILITATOR
    
    # Create Participant
    participant = Participant(
        workshop_id=workshop.id,
        display_name=join_in.display_name,
        role=role
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    # If facilitator request, notify admins
    if role == ParticipantRole.PENDING_FACILITATOR:
        await sio.emit(
            'facilitator_request',
            {
                'participant_id': str(participant.id),
                'display_name': participant.display_name,
                'workshop_id': str(workshop.id)
            },
            room=str(workshop.id)
        )
    
    return JoinResponse(
        participant_id=participant.id,
        workshop_id=workshop.id,
        workshop_title=workshop.title,
        workshop_status=workshop.status,
        role=role
    )

from app.schemas.participant import RoleUpdate

@router.patch("/{participant_id}/role", response_model=JoinResponse)
async def update_role(
    participant_id: str,
    update_in: RoleUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    participant = result.scalars().first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
        
    participant.role = update_in.role
    await db.commit()
    await db.refresh(participant)
    
    # Broadcast Role Update
    await sio.emit(
        'participant_role_update',
        {
            'participant_id': str(participant.id),
            'role': participant.role
        },
        room=str(participant.workshop_id)
    )
    
    # Needs to fetch workshop details for response conform
    ws_result = await db.execute(select(Workshop).where(Workshop.id == participant.workshop_id))
    workshop = ws_result.scalars().first()
    
    return JoinResponse(
        participant_id=participant.id,
        workshop_id=workshop.id,
        workshop_title=workshop.title,
        workshop_status=workshop.status,
        role=participant.role
    )
