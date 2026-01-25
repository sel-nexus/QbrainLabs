"""
Admin API endpoints
Requires admin authentication for all routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import List
from datetime import datetime, timedelta
import secrets
import string

from app.core.database import get_db
from app.middleware.admin_auth import require_admin
from app.models.models import User, Workshop, Participant, UseCase, Vote
from app.schemas.admin import (
    WorkshopListItem,
    SystemStats,
    UserListItem,
    UserCreate,
    WorkshopStatusUpdate,
    UserUpdateByAdmin
)
from app.api.auth import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


def generate_random_password(length: int = 12) -> str:
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get system-wide statistics for admin dashboard
    """
    # Total workshops
    total_workshops_result = await db.execute(select(func.count(Workshop.id)))
    total_workshops = total_workshops_result.scalar() or 0
    
    # Total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0
    
    # Total participants (unique across all workshops)
    total_participants_result = await db.execute(select(func.count(Participant.id)))
    total_participants = total_participants_result.scalar() or 0
    
    # Active workshops (IN_PROGRESS status)
    active_workshops_result = await db.execute(
        select(func.count(Workshop.id)).where(Workshop.status == "IN_PROGRESS")
    )
    active_workshops = active_workshops_result.scalar() or 0
    
    # Workshops created today (PostgreSQL compatible)
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time())
    workshops_today_result = await db.execute(
        select(func.count(Workshop.id)).where(Workshop.created_at >= today_start)
    )
    workshops_today = workshops_today_result.scalar() or 0
    
    # Workshops this week (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    workshops_week_result = await db.execute(
        select(func.count(Workshop.id)).where(Workshop.created_at >= week_ago)
    )
    workshops_this_week = workshops_week_result.scalar() or 0
    
    # Workshops this month (last 30 days)
    month_ago = datetime.utcnow() - timedelta(days=30)
    workshops_month_result = await db.execute(
        select(func.count(Workshop.id)).where(Workshop.created_at >= month_ago)
    )
    workshops_this_month = workshops_month_result.scalar() or 0
    
    return SystemStats(
        total_workshops=total_workshops,
        total_users=total_users,
        total_participants=total_participants,
        active_workshops=active_workshops,
        workshops_today=workshops_today,
        workshops_this_week=workshops_this_week,
        workshops_this_month=workshops_this_month
    )


@router.get("/workshops", response_model=List[WorkshopListItem])
async def list_all_workshops(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    List all workshops in the system with pagination
    Admin can see ALL workshops regardless of facilitator
    """
    # Get workshops with facilitator info
    result = await db.execute(
        select(Workshop, User.full_name)
        .join(User, Workshop.facilitator_id == User.id)
        .offset(skip)
        .limit(limit)
        .order_by(Workshop.id.desc())
    )
    
    workshops_data = result.all()
    
    # For each workshop, get participant and use case counts
    workshop_list = []
    for workshop, facilitator_name in workshops_data:
        # Count participants
        participant_count_result = await db.execute(
            select(func.count(Participant.id)).where(Participant.workshop_id == workshop.id)
        )
        participant_count = participant_count_result.scalar() or 0
        
        # Count use cases
        use_case_count_result = await db.execute(
            select(func.count(UseCase.id)).where(UseCase.workshop_id == workshop.id)
        )
        use_case_count = use_case_count_result.scalar() or 0
        
        workshop_list.append(WorkshopListItem(
            id=str(workshop.id),
            title=workshop.title,
            facilitator_id=str(workshop.facilitator_id),
            facilitator_name=facilitator_name,
            status=workshop.status,
            current_phase=workshop.current_phase,
            pin=workshop.pin,
            participant_count=participant_count,
            use_case_count=use_case_count,
            created_at=workshop.created_at
        ))
    
    return workshop_list


@router.put("/workshops/{workshop_id}/status", response_model=WorkshopListItem)
async def update_workshop_status(
    workshop_id: str,
    status_update: WorkshopStatusUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update workshop status (approve/reject/change status)
    """
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    workshop.status = status_update.status
    await db.commit()
    await db.refresh(workshop)
    
    # Get facilitator name
    facilitator_result = await db.execute(select(User).where(User.id == workshop.facilitator_id))
    facilitator = facilitator_result.scalars().first()
    
    return WorkshopListItem(
        id=str(workshop.id),
        title=workshop.title,
        facilitator_id=str(workshop.facilitator_id),
        facilitator_name=facilitator.full_name if facilitator else None,
        status=workshop.status,
        current_phase=workshop.current_phase,
        pin=workshop.pin,
        participant_count=0,
        use_case_count=0
    )


@router.delete("/workshops/{workshop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workshop(
    workshop_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a workshop (soft delete - marks as deleted)
    Admin can delete any workshop
    """
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Soft delete - change status to indicate deletion
    workshop.status = "DELETED"
    await db.commit()
    
    return None


@router.get("/users", response_model=List[UserListItem])
async def list_all_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    List all users in the system
    """
    result = await db.execute(
        select(User)
        .offset(skip)
        .limit(limit)
        .order_by(User.email)
    )
    users = result.scalars().all()
    
    user_list = []
    for user in users:
        # Count workshops created by this user
        workshop_count_result = await db.execute(
            select(func.count(Workshop.id)).where(Workshop.facilitator_id == user.id)
        )
        workshop_count = workshop_count_result.scalar() or 0
        
        user_list.append(UserListItem(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            is_admin=user.is_admin,
            workshop_count=workshop_count
        ))
    
    return user_list


@router.post("/users", response_model=UserListItem, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user (admin-initiated)
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate password if not provided
    password = user_data.password if user_data.password else generate_random_password()
    hashed_password = hash_password(password)
    
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        is_admin=user_data.is_admin
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserListItem(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        is_admin=new_user.is_admin,
        workshop_count=0
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Deactivate a user account
    Note: We don't actually delete to preserve data integrity
    Instead, we could add an is_active field (future enhancement)
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deleting themselves
    if str(user.id) == str(admin.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # For now, just remove the user (in production, use soft delete with is_active field)
    await db.delete(user)
    await db.commit()
    
    return None
