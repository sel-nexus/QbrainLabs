from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from app.core.database import get_db
from app.core.db_utils import get_or_404
from app.models.models import Workshop, Participant, WorkshopStatus, ParticipantRole, User, UseCase
from app.models import Survey, SurveyResponse
from app.schemas.participant import JoinRequest, JoinResponse, ParticipantSessionInfo, UseCaseSummary, SurveySummary, ParticipantResponse
from app.core.socket_manager import sio
from app.api.auth import get_current_user
from typing import List

router = APIRouter()

@router.get("/workshop/{workshop_id}", response_model=List[ParticipantResponse])
async def list_workshop_participants(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all participants in a workshop."""
    result = await db.execute(
        select(Participant)
        .where(Participant.workshop_id == workshop_id)
        .order_by(Participant.display_name)
    )
    return result.scalars().all()


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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update participant role. Requires authentication (facilitator only)."""
    participant = await get_or_404(db, Participant, participant_id, "Participant")
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


@router.get("/session/{participant_id}", response_model=ParticipantSessionInfo)
async def get_participant_session_info(
    participant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get session info for a participant including workshop details, use cases, and surveys."""
    # Get participant
    participant = await get_or_404(db, Participant, participant_id, "Participant")

    # Get workshop
    workshop = await get_or_404(db, Workshop, participant.workshop_id, "Workshop")
    
    # Get use cases for this workshop
    uc_result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop.id)
        .order_by(UseCase.title)
    )
    use_cases = uc_result.scalars().all()
    
    # Get surveys for this workshop (only active or closed ones visible to participants)
    survey_result = await db.execute(
        select(Survey)
        .where(Survey.workshop_id == workshop.id)
        .where(Survey.status.in_(["ACTIVE", "CLOSED", "PAUSED"]))
    )
    surveys = survey_result.scalars().all()
    
    # Check which surveys this participant has completed
    survey_summaries = []
    for survey in surveys:
        # Check if participant completed this survey
        response_result = await db.execute(
            select(SurveyResponse).where(
                and_(
                    SurveyResponse.survey_id == survey.id,
                    SurveyResponse.participant_id == participant_id,
                    SurveyResponse.status == "completed"
                )
            )
        )
        completed = response_result.scalars().first() is not None
        
        survey_summaries.append(SurveySummary(
            id=survey.id,
            title=survey.title,
            status=survey.status,
            completed=completed
        ))
    
    return ParticipantSessionInfo(
        workshop_id=workshop.id,
        workshop_title=workshop.title,
        workshop_status=workshop.status,
        current_phase=workshop.current_phase or "LOBBY",
        use_cases=[UseCaseSummary(id=uc.id, title=uc.title, description=uc.description) for uc in use_cases],
        surveys=survey_summaries
    )
