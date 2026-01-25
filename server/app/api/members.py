"""
Member API Endpoints
Implements US30: User Roles & Access Control System

Endpoints for:
- Members: Join workshop via PIN, access workshop features
- Session management for anonymous members
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import Workshop, Participant, ParticipantRole, WorkshopStatus
from app.models.rbac import MemberSession
from app.middleware.rbac import (
    require_member_session,
    get_member_session,
    create_member_session,
    log_role_action
)
from app.schemas.rbac import (
    MemberJoinRequest,
    MemberSessionResponse,
    MemberWorkshopInfo
)

router = APIRouter(prefix="/api/member", tags=["members"])


@router.post("/join", response_model=MemberSessionResponse)
async def join_workshop(
    join_request: MemberJoinRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Join a workshop using a PIN.
    Creates a member session and participant record.
    """
    pin = join_request.pin.upper()
    
    # Find workshop by PIN
    result = await db.execute(
        select(Workshop).where(Workshop.pin == pin)
    )
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid workshop PIN. Please check and try again."
        )
    
    # Check workshop status - must be OPEN or IN_PROGRESS
    if workshop.status not in [WorkshopStatus.OPEN.value, WorkshopStatus.IN_PROGRESS.value, "OPEN", "IN_PROGRESS"]:
        status_messages = {
            WorkshopStatus.DRAFT.value: "This workshop is not yet open for participants.",
            "DRAFT": "This workshop is not yet open for participants.",
            WorkshopStatus.COMPLETED.value: "This workshop has already ended.",
            "COMPLETED": "This workshop has already ended.",
            "DELETED": "This workshop is no longer available.",
        }
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=status_messages.get(workshop.status, "This workshop is not accepting participants.")
        )
    
    # Check for unique display name in workshop
    existing_name = await db.execute(
        select(Participant).where(
            Participant.workshop_id == workshop.id,
            func.lower(Participant.display_name) == join_request.display_name.lower()
        )
    )
    if existing_name.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This name is already taken in this workshop. Please choose a different name."
        )
    
    # Create participant record
    participant = Participant(
        workshop_id=workshop.id,
        display_name=join_request.display_name,
        role=ParticipantRole.PARTICIPANT.value
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    
    # Create member session
    session = await create_member_session(
        db=db,
        workshop_id=str(workshop.id),
        display_name=join_request.display_name,
        participant_id=str(participant.id),
        request=request,
        expires_hours=24  # Session expires in 24 hours
    )
    
    # Set session cookie
    response.set_cookie(
        key="member_session",
        value=session.session_token,
        httponly=True,
        secure=True,  # Use secure in production
        samesite="lax",
        max_age=86400  # 24 hours
    )
    
    # Log the join action
    await log_role_action(
        db=db,
        action="member_joined_workshop",
        new_value={
            "workshop_id": str(workshop.id),
            "workshop_title": workshop.title,
            "display_name": join_request.display_name,
            "participant_id": str(participant.id)
        },
        request=request,
        details=f"Member '{join_request.display_name}' joined workshop '{workshop.title}'"
    )
    
    return MemberSessionResponse(
        session_id=str(session.id),
        session_token=session.session_token,
        workshop_id=str(workshop.id),
        workshop_title=workshop.title,
        display_name=session.display_name,
        participant_id=str(participant.id),
        expires_at=session.expires_at
    )


@router.get("/workshop", response_model=MemberWorkshopInfo)
async def get_current_workshop(
    session: MemberSession = Depends(require_member_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current workshop info for the member.
    Requires valid member session.
    """
    result = await db.execute(
        select(Workshop).where(Workshop.id == session.workshop_id)
    )
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    return MemberWorkshopInfo(
        id=str(workshop.id),
        title=workshop.title,
        status=workshop.status,
        current_phase=workshop.current_phase
    )


@router.get("/session", response_model=MemberSessionResponse)
async def get_session_info(
    session: MemberSession = Depends(require_member_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current session information.
    Requires valid member session.
    """
    # Get workshop info
    result = await db.execute(
        select(Workshop).where(Workshop.id == session.workshop_id)
    )
    workshop = result.scalars().first()
    
    return MemberSessionResponse(
        session_id=str(session.id),
        session_token=session.session_token,
        workshop_id=str(session.workshop_id),
        workshop_title=workshop.title if workshop else "Unknown",
        display_name=session.display_name,
        participant_id=str(session.participant_id) if session.participant_id else "",
        expires_at=session.expires_at
    )


@router.post("/leave")
async def leave_workshop(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """
    Leave the current workshop and invalidate session.
    """
    session = await get_member_session(request, db)
    
    if session:
        # Get workshop info for logging
        workshop_result = await db.execute(
            select(Workshop).where(Workshop.id == session.workshop_id)
        )
        workshop = workshop_result.scalars().first()
        
        # Deactivate session
        session.is_active = False
        await db.commit()
        
        # Log the action
        await log_role_action(
            db=db,
            action="member_left_workshop",
            old_value={
                "workshop_id": str(session.workshop_id),
                "workshop_title": workshop.title if workshop else None,
                "display_name": session.display_name
            },
            request=request,
            details=f"Member '{session.display_name}' left workshop"
        )
    
    # Clear session cookie
    response.delete_cookie(key="member_session")
    
    return {"message": "Successfully left the workshop"}


@router.post("/refresh")
async def refresh_session(
    request: Request,
    response: Response,
    session: MemberSession = Depends(require_member_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh the member session to extend expiration.
    """
    from datetime import timedelta
    
    # Extend expiration by 24 hours
    session.expires_at = datetime.utcnow() + timedelta(hours=24)
    session.last_active = datetime.utcnow()
    await db.commit()
    
    # Update cookie
    response.set_cookie(
        key="member_session",
        value=session.session_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=86400
    )
    
    # Get workshop info
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == session.workshop_id)
    )
    workshop = workshop_result.scalars().first()
    
    return MemberSessionResponse(
        session_id=str(session.id),
        session_token=session.session_token,
        workshop_id=str(session.workshop_id),
        workshop_title=workshop.title if workshop else "Unknown",
        display_name=session.display_name,
        participant_id=str(session.participant_id) if session.participant_id else "",
        expires_at=session.expires_at
    )


@router.get("/check-name/{pin}/{display_name}")
async def check_name_availability(
    pin: str,
    display_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if a display name is available in a workshop.
    Public endpoint for pre-validation.
    """
    pin = pin.upper()
    
    # Find workshop
    result = await db.execute(
        select(Workshop).where(Workshop.pin == pin)
    )
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Check name
    existing = await db.execute(
        select(Participant).where(
            Participant.workshop_id == workshop.id,
            func.lower(Participant.display_name) == display_name.lower()
        )
    )
    
    is_available = existing.scalars().first() is None
    
    return {
        "available": is_available,
        "display_name": display_name,
        "workshop_id": str(workshop.id)
    }
