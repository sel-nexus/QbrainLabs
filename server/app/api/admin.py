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
from app.models.models import User, Workshop, Participant, UseCase, Vote, WorkshopStatus
from app.models.rbac import RoleAuditLog, FacilitatorAccessRequest, WorkshopFacilitator
from app.models.survey import Survey
from app.models.templates import WorkshopTemplate
from app.models.organization import OrganizationInvitation
from app.models.subscription import FeatureFlagOverride
from app.models.settings import SystemSetting, SettingsAuditLog
from app.models.rag_feedback import AIFeedback, RAGDocument, PromptTemplate
from app.models.marketplace import MarketplaceTemplate, TemplateReview, TemplateDownload, TemplateFavorite, TemplateCollection
from app.models.feedback import Feedback, OnboardingProgress, HelpArticle, UserTourProgress
from app.models.challenge import ChallengeCard
from app.models.analytics import CustomDashboard, GeneratedReport
from app.schemas.admin import (
    WorkshopListItem,
    SystemStats,
    UserListItem,
    UserCreate,
    WorkshopStatusUpdate,
    UserUpdateByAdmin,
    UserDeletionImpact
)
from app.api.auth import hash_password
from sqlalchemy import update, delete

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
    Excludes deleted workshops
    """
    # Get workshops with facilitator info, excluding deleted workshops
    result = await db.execute(
        select(Workshop, User.full_name)
        .join(User, Workshop.facilitator_id == User.id)
        .where(Workshop.status != WorkshopStatus.DELETED)
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
    try:
        result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
        workshop = result.scalars().first()
        
        if not workshop:
            raise HTTPException(status_code=404, detail="Workshop not found")
        
        # Check if already deleted
        if workshop.status == WorkshopStatus.DELETED:
            raise HTTPException(status_code=400, detail="Workshop is already deleted")
        
        # Soft delete - change status to indicate deletion
        workshop.status = WorkshopStatus.DELETED
        await db.commit()
        await db.refresh(workshop)
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete workshop: {str(e)}")


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


@router.get("/users/{user_id}/impact", response_model=UserDeletionImpact)
async def check_user_deletion_impact(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Check impact of deleting a user by counting created resources
    and checking for recent activity.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 1. Count Resources
    # Workshops
    res = await db.execute(
        select(func.count(Workshop.id)).where(Workshop.facilitator_id == user.id)
    )
    workshops_owned = res.scalar() or 0

    # Surveys
    res = await db.execute(
        select(func.count(Survey.id)).where(Survey.facilitator_id == user.id)
    )
    surveys_created = res.scalar() or 0

    # Templates (Workshop)
    res = await db.execute(
        select(func.count(WorkshopTemplate.id)).where(WorkshopTemplate.author_id == user.id)
    )
    templates_created = res.scalar() or 0

    # Marketplace Templates
    res = await db.execute(
        select(func.count(MarketplaceTemplate.id)).where(MarketplaceTemplate.author_id == user.id)
    )
    marketplace_templates = res.scalar() or 0

    # Challenges
    res = await db.execute(
        select(func.count(ChallengeCard.id)).where(ChallengeCard.created_by == user.id)
    )
    challenges_created = res.scalar() or 0

    # 2. Check Recent Activity (Last 30 days)
    # We check the most recent creation timestamp across resources
    last_active_at = None
    has_recent = False
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)

    # Helper to check latest date
    async def get_latest_date(model, user_field):
        r = await db.execute(
            select(func.max(model.created_at)).where(getattr(model, user_field) == user.id)
        )
        return r.scalar()

    dates = []
    dates.append(await get_latest_date(Workshop, 'facilitator_id'))
    dates.append(await get_latest_date(Survey, 'facilitator_id'))
    dates.append(await get_latest_date(WorkshopTemplate, 'author_id'))
    dates.append(await get_latest_date(MarketplaceTemplate, 'author_id'))
    dates.append(await get_latest_date(ChallengeCard, 'created_by'))
    
    # Filter out None and find max
    valid_dates = [d for d in dates if d is not None]
    if valid_dates:
        last_active_at = max(valid_dates)
        if last_active_at >= month_ago:
            has_recent = True

    # Construct warning message
    warnings = []
    if workshops_owned > 0:
        warnings.append(f"{workshops_owned} workshops")
    if surveys_created > 0:
        warnings.append(f"{surveys_created} surveys")
    if templates_created > 0 or marketplace_templates > 0:
        warnings.append(f"{templates_created + marketplace_templates} templates")
    if challenges_created > 0:
        warnings.append(f"{challenges_created} challenges")
    
    warning_msg = None
    if warnings:
        warning_msg = f"This user owns {', '.join(warnings)}. All resources will be reassigned to you or deleted."
    elif has_recent:
        warning_msg = "User has been active recently."
        
    return UserDeletionImpact(
        workshops_owned=workshops_owned,
        surveys_created=surveys_created,
        templates_created=templates_created,
        marketplace_templates=marketplace_templates,
        challenges_created=challenges_created,
        last_active_at=last_active_at,
        has_recent_activity=has_recent,
        warning_message=warning_msg
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user account securely.
    Handles all FK constraints by identifying all relationships and resolving them
    via reassignment (to admin), nullification, or deletion of dependent records.
    """
    try:
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
        
        # === 1. Reassign ownership (to Admin) ===
        # Workshops
        result = await db.execute(select(Workshop).where(Workshop.facilitator_id == user.id))
        owned_workshops = result.scalars().all()
        for workshop in owned_workshops:
            workshop.facilitator_id = admin.id
            workshop.status = WorkshopStatus.DELETED
        
        # Surveys
        await db.execute(
            update(Survey)
            .where(Survey.facilitator_id == user.id)
            .values(facilitator_id=admin.id)
        )

        # WorkshopTemplates
        await db.execute(
            update(WorkshopTemplate)
            .where(WorkshopTemplate.author_id == user.id)
            .values(author_id=admin.id)
        )

        # MarketplaceTemplates
        await db.execute(
            update(MarketplaceTemplate)
            .where(MarketplaceTemplate.author_id == user.id)
            .values(author_id=admin.id)
        )

        # ChallengeCards (Reassign to Admin)
        await db.execute(
            update(ChallengeCard)
            .where(ChallengeCard.created_by == user.id)
            .values(created_by=admin.id)
        )

        # OrganizationInvitations
        await db.execute(
            update(OrganizationInvitation)
            .where(OrganizationInvitation.invited_by_id == user.id)
            .values(invited_by_id=admin.id)
        )

        # WorkshopFacilitator (assigned_by)
        await db.execute(
            update(WorkshopFacilitator)
            .where(WorkshopFacilitator.assigned_by == user.id)
            .values(assigned_by=admin.id)
        )

        # === 2. Nullify references (Set to NULL) ===
        tables_to_nullify = [
            (RoleAuditLog, 'user_id'),
            (RoleAuditLog, 'performed_by'),
            (FacilitatorAccessRequest, 'reviewed_by'),
            (User, 'disabled_by'),
            (FeatureFlagOverride, 'created_by'),
            (SystemSetting, 'updated_by'),
            (SettingsAuditLog, 'changed_by'),
            (AIFeedback, 'user_id'),
            (RAGDocument, 'created_by'),
            (PromptTemplate, 'created_by'),
            (TemplateCollection, 'curator_id'),
            (Feedback, 'assigned_to'),
            (HelpArticle, 'author_id'),
            (GeneratedReport, 'created_by')
        ]

        for model, field in tables_to_nullify:
            await db.execute(
                update(model)
                .where(getattr(model, field) == user.id)
                .values({field: None})
            )

        # === 3. Delete dependent records (Cascade/Cleanup) ===
        # OnboardingProgress
        await db.execute(delete(OnboardingProgress).where(OnboardingProgress.user_id == user.id))
        
        # UserTourProgress
        await db.execute(delete(UserTourProgress).where(UserTourProgress.user_id == user.id))
        
        # TemplateFavorite
        await db.execute(delete(TemplateFavorite).where(TemplateFavorite.user_id == user.id))
        
        # TemplateDownload
        await db.execute(delete(TemplateDownload).where(TemplateDownload.user_id == user.id))
        
        # TemplateReview
        await db.execute(delete(TemplateReview).where(TemplateReview.user_id == user.id))
        
        # CustomDashboard
        await db.execute(delete(CustomDashboard).where(CustomDashboard.user_id == user.id))
        
        # Feedback (submitted by user)
        # We delete user feedback to respect "Right to be Forgotten" in this context,
        # or we could keep it anonymized. Deleting is safer to avoid integrity issues.
        await db.execute(delete(Feedback).where(Feedback.user_id == user.id))

        # === 4. Delete the User ===
        await db.delete(user)
        await db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        print(f"Error deleting user: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")
