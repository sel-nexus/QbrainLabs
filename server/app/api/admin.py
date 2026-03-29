"""
Admin API endpoints
Requires admin authentication for all routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import List, Optional, Any, Dict
from datetime import datetime, timedelta
import logging
import secrets
import string
import uuid

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
from app.models.llm_usage import LLMUsageLog
from app.schemas.admin import (
    WorkshopListItem,
    SystemStats,
    UserListItem,
    UserCreate,
    WorkshopStatusUpdate,
    UserUpdateByAdmin,
    UserDeletionImpact,
    LLMUsageSummary,
    LLMUsageByFeature,
    LLMUsageByWorkshop,
    LLMUsageByUser,
    LLMUsageByModel,
    LLMUsageByDay,
    LLMRecentLog,
)
from app.api.auth import hash_password
from sqlalchemy import update, delete
from sqlalchemy.exc import ProgrammingError, OperationalError

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
    # Get workshops with facilitator info and counts in a single query
    participant_count_sq = (
        select(func.count(Participant.id))
        .where(Participant.workshop_id == Workshop.id)
        .correlate(Workshop)
        .scalar_subquery()
    )
    use_case_count_sq = (
        select(func.count(UseCase.id))
        .where(UseCase.workshop_id == Workshop.id)
        .correlate(Workshop)
        .scalar_subquery()
    )
    result = await db.execute(
        select(Workshop, User.full_name, participant_count_sq, use_case_count_sq)
        .join(User, Workshop.facilitator_id == User.id)
        .where(Workshop.status != WorkshopStatus.DELETED)
        .offset(skip)
        .limit(limit)
        .order_by(Workshop.id.desc())
    )

    workshop_list = []
    for workshop, facilitator_name, participant_count, use_case_count in result.all():
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

        user_id_str = str(user.id)
        for model, field in tables_to_nullify:
            await db.execute(
                update(model)
                .where(getattr(model, field) == user_id_str)
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


# ============================================================================
# LLM Usage Tracking Endpoints
# ============================================================================

def _apply_date_filter(query, start_date, end_date):
    """Helper to apply optional date range filters.
    Strips timezone info to avoid offset-naive vs offset-aware mismatch
    when the DB column is TIMESTAMP WITHOUT TIME ZONE."""
    if start_date:
        if start_date.tzinfo is not None:
            start_date = start_date.replace(tzinfo=None)
        query = query.where(LLMUsageLog.created_at >= start_date)
    if end_date:
        if end_date.tzinfo is not None:
            end_date = end_date.replace(tzinfo=None)
        query = query.where(LLMUsageLog.created_at <= end_date)
    return query


def _int(v):
    """Coerce to int for JSON-safe response (DB may return Decimal/long)."""
    if v is None:
        return 0
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


_EMPTY_LLM_SUMMARY = LLMUsageSummary(
    total_calls=0,
    total_prompt_tokens=0,
    total_completion_tokens=0,
    total_tokens=0,
    estimated_cost_cents=0,
    unique_users=0,
    unique_workshops=0,
    success_count=0,
    error_count=0,
)


@router.get("/llm-usage/summary", response_model=LLMUsageSummary)
async def get_llm_usage_summary(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = Query(None, description="Filter logs from this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs until this date"),
):
    """Get overall LLM usage statistics with optional date range filtering."""
    try:
        base = select(
            func.count(LLMUsageLog.id).label('total_calls'),
            func.coalesce(func.sum(LLMUsageLog.prompt_tokens), 0).label('total_prompt_tokens'),
            func.coalesce(func.sum(LLMUsageLog.completion_tokens), 0).label('total_completion_tokens'),
            func.coalesce(func.sum(LLMUsageLog.total_tokens), 0).label('total_tokens'),
            func.coalesce(func.sum(LLMUsageLog.estimated_cost_cents), 0).label('estimated_cost_cents'),
            func.count(func.distinct(LLMUsageLog.user_id)).label('unique_users'),
            func.count(func.distinct(LLMUsageLog.workshop_id)).label('unique_workshops'),
        ).select_from(LLMUsageLog)
        query = _apply_date_filter(base, start_date, end_date)
        result = await db.execute(query)
        row = result.first()

        # When no rows match (or empty table), aggregates can still return one row; guard against None
        if row is None:
            return _EMPTY_LLM_SUMMARY

        # Count successes / errors in a second cheap query
        sc_query = _apply_date_filter(
            select(func.count(LLMUsageLog.id)).where(LLMUsageLog.success == 'true'),
            start_date, end_date
        )
        ec_query = _apply_date_filter(
            select(func.count(LLMUsageLog.id)).where(LLMUsageLog.success != 'true'),
            start_date, end_date
        )
        sc_result = await db.execute(sc_query)
        ec_result = await db.execute(ec_query)

        return LLMUsageSummary(
            total_calls=_int(row.total_calls),
            total_prompt_tokens=_int(row.total_prompt_tokens),
            total_completion_tokens=_int(row.total_completion_tokens),
            total_tokens=_int(row.total_tokens),
            estimated_cost_cents=_int(row.estimated_cost_cents),
            unique_users=_int(row.unique_users),
            unique_workshops=_int(row.unique_workshops),
            success_count=_int(sc_result.scalar()),
            error_count=_int(ec_result.scalar()),
        )
    except (ProgrammingError, OperationalError):
        return _EMPTY_LLM_SUMMARY
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage summary failed, returning empty: %s", e)
        return _EMPTY_LLM_SUMMARY
    except BaseException as e:
        logging.getLogger(__name__).warning("LLM usage summary unexpected error, returning empty: %s", e)
        return _EMPTY_LLM_SUMMARY


@router.get("/llm-usage/by-feature", response_model=List[LLMUsageByFeature])
async def get_llm_usage_by_feature(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """Get LLM usage grouped by feature."""
    try:
        query = _apply_date_filter(
            select(
                LLMUsageLog.feature,
                func.count(LLMUsageLog.id).label('call_count'),
                func.coalesce(func.sum(LLMUsageLog.total_tokens), 0).label('total_tokens'),
                func.coalesce(func.sum(LLMUsageLog.prompt_tokens), 0).label('total_prompt_tokens'),
                func.coalesce(func.sum(LLMUsageLog.completion_tokens), 0).label('total_completion_tokens'),
                func.coalesce(func.sum(LLMUsageLog.estimated_cost_cents), 0).label('estimated_cost_cents'),
            ).group_by(LLMUsageLog.feature
            ).order_by(func.count(LLMUsageLog.id).desc()),
            start_date, end_date
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            LLMUsageByFeature(
                feature=str(row.feature) if row.feature else "unknown",
                call_count=_int(row.call_count),
                total_tokens=_int(row.total_tokens),
                total_prompt_tokens=_int(row.total_prompt_tokens),
                total_completion_tokens=_int(row.total_completion_tokens),
                estimated_cost_cents=_int(row.estimated_cost_cents),
            )
            for row in rows
        ]
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage by-feature failed: %s", e)
        return []


@router.get("/llm-usage/by-workshop", response_model=List[LLMUsageByWorkshop])
async def get_llm_usage_by_workshop(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = 20
):
    """Get LLM usage grouped by workshop, ordered by call count."""
    try:
        query = _apply_date_filter(
            select(
                LLMUsageLog.workshop_id,
                Workshop.title.label('workshop_title'),
                func.count(LLMUsageLog.id).label('call_count'),
                func.coalesce(func.sum(LLMUsageLog.total_tokens), 0).label('total_tokens'),
                func.coalesce(func.sum(LLMUsageLog.estimated_cost_cents), 0).label('estimated_cost_cents')
            ).outerjoin(Workshop, LLMUsageLog.workshop_id == Workshop.id
            ).where(LLMUsageLog.workshop_id.isnot(None)
            ).group_by(LLMUsageLog.workshop_id, Workshop.title
            ).order_by(func.count(LLMUsageLog.id).desc()
            ).limit(limit),
            start_date, end_date
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            LLMUsageByWorkshop(
                workshop_id=str(row.workshop_id) if row.workshop_id else "",
                workshop_title=row.workshop_title,
                call_count=_int(row.call_count),
                total_tokens=_int(row.total_tokens),
                estimated_cost_cents=_int(row.estimated_cost_cents)
            )
            for row in rows
        ]
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage by-workshop failed: %s", e)
        return []


@router.get("/llm-usage/by-user", response_model=List[LLMUsageByUser])
async def get_llm_usage_by_user(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = 20
):
    """Get LLM usage grouped by user, ordered by call count."""
    try:
        query = _apply_date_filter(
            select(
                LLMUsageLog.user_id,
                User.email.label('user_email'),
                User.full_name.label('user_name'),
                func.count(LLMUsageLog.id).label('call_count'),
                func.coalesce(func.sum(LLMUsageLog.total_tokens), 0).label('total_tokens'),
                func.coalesce(func.sum(LLMUsageLog.estimated_cost_cents), 0).label('estimated_cost_cents')
            ).outerjoin(User, LLMUsageLog.user_id == User.id
            ).where(LLMUsageLog.user_id.isnot(None)
            ).group_by(LLMUsageLog.user_id, User.email, User.full_name
            ).order_by(func.count(LLMUsageLog.id).desc()
            ).limit(limit),
            start_date, end_date
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            LLMUsageByUser(
                user_id=str(row.user_id) if row.user_id else "",
                user_email=row.user_email,
                user_name=row.user_name,
                call_count=_int(row.call_count),
                total_tokens=_int(row.total_tokens),
                estimated_cost_cents=_int(row.estimated_cost_cents)
            )
            for row in rows
        ]
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage by-user failed: %s", e)
        return []


@router.get("/llm-usage/by-model", response_model=List[LLMUsageByModel])
async def get_llm_usage_by_model(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
):
    """Get LLM usage grouped by model name."""
    try:
        from sqlalchemy import text as sa_text

        date_clause = ""
        params: dict = {}
        if start_date:
            if start_date.tzinfo is not None:
                start_date = start_date.replace(tzinfo=None)
            date_clause += " WHERE created_at >= :start_date"
            params["start_date"] = start_date
        if end_date:
            if end_date.tzinfo is not None:
                end_date = end_date.replace(tzinfo=None)
            joiner = " AND" if date_clause else " WHERE"
            date_clause += f"{joiner} created_at <= :end_date"
            params["end_date"] = end_date

        sql = sa_text(f"""
            SELECT
                COALESCE(model_name, 'unknown') AS model_name,
                COUNT(id) AS call_count,
                COALESCE(SUM(total_tokens), 0) AS total_tokens,
                COALESCE(SUM(prompt_tokens), 0) AS total_prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) AS total_completion_tokens,
                COALESCE(SUM(estimated_cost_cents), 0) AS estimated_cost_cents
            FROM llm_usage_logs
            {date_clause}
            GROUP BY COALESCE(model_name, 'unknown')
            ORDER BY call_count DESC
        """)
        result = await db.execute(sql, params)
        rows = result.all()
        return [
            LLMUsageByModel(
                model_name=str(row.model_name) if row.model_name else "unknown",
                call_count=_int(row.call_count),
                total_tokens=_int(row.total_tokens),
                total_prompt_tokens=_int(row.total_prompt_tokens),
                total_completion_tokens=_int(row.total_completion_tokens),
                estimated_cost_cents=_int(row.estimated_cost_cents),
            )
            for row in rows
        ]
    except (ProgrammingError, OperationalError) as e:
        logging.getLogger(__name__).warning("LLM usage by-model DB error: %s", e)
        return []
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage by-model failed: %s", e)
        return []


@router.get("/llm-usage/by-day", response_model=List[LLMUsageByDay])
async def get_llm_usage_by_day(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    days: int = 30
):
    """Get daily LLM usage trend. Defaults to last 30 days."""
    try:
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=days)
        query = _apply_date_filter(
            select(
                func.date(LLMUsageLog.created_at).label('date'),
                func.count(LLMUsageLog.id).label('call_count'),
                func.coalesce(func.sum(LLMUsageLog.total_tokens), 0).label('total_tokens'),
                func.coalesce(func.sum(LLMUsageLog.estimated_cost_cents), 0).label('estimated_cost_cents'),
            ).group_by(func.date(LLMUsageLog.created_at)
            ).order_by(func.date(LLMUsageLog.created_at).asc()),
            start_date, end_date
        )
        result = await db.execute(query)
        rows = result.all()
        return [
            LLMUsageByDay(
                date=str(row.date) if row.date is not None else "",
                call_count=_int(row.call_count),
                total_tokens=_int(row.total_tokens),
                estimated_cost_cents=_int(row.estimated_cost_cents),
            )
            for row in rows
        ]
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage by-day failed: %s", e)
        return []


@router.get("/llm-usage/recent", response_model=List[LLMRecentLog])
async def get_llm_usage_recent(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    feature: Optional[str] = None,
):
    """Get recent individual LLM usage log entries with optional feature filter."""
    try:
        query = select(LLMUsageLog).order_by(LLMUsageLog.created_at.desc()).limit(limit).offset(offset)
        if feature:
            query = query.where(LLMUsageLog.feature == feature)
        result = await db.execute(query)
        rows = result.scalars().all()
        return [
            LLMRecentLog(
                id=str(row.id),
                feature=str(row.feature) if row.feature else "",
                model_name=row.model_name,
                prompt_tokens=_int(row.prompt_tokens),
                completion_tokens=_int(row.completion_tokens),
                total_tokens=_int(row.total_tokens),
                estimated_cost_cents=_int(row.estimated_cost_cents),
                success=str(row.success) if row.success else "true",
                workshop_id=str(row.workshop_id) if row.workshop_id else None,
                user_id=str(row.user_id) if row.user_id else None,
                created_at=row.created_at,
            )
            for row in rows
        ]
    except Exception as e:
        logging.getLogger(__name__).warning("LLM usage recent failed: %s", e)
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Use Case Import Endpoints
# ─────────────────────────────────────────────────────────────────────────────

# Industry/domain keyword classification (mirrors frontend INDUSTRIES constant)
_INDUSTRY_KEYWORDS: Dict[str, List[str]] = {
    "AI for HR":                 ["hr", "human resources", "recruitment", "payroll", "employee", "talent", "workforce", "onboarding"],
    "AI for IT":                 ["it ", "information technology", "software", "deployment", "infrastructure", "helpdesk", "help desk", "ticket", "service desk", "desktop", "support automation"],
    "AI for Finance":            ["finance", "financial", "invoice", "billing", "payment", "accounting", "accounts payable", "accounts receivable", "spend", "budget", "tax", "audit"],
    "AI for Healthcare":         ["health", "medical", "clinical", "patient", "hospital", "pharma", "diagnosis", "care", "drug", "nurse"],
    "AI for Legal & Compliance": ["legal", "compliance", "regulatory", "contract", "gdpr", "privacy", "policy", "litigation"],
    "AI for Customer Service":   ["customer", "cx ", "service", "support", "response time", "client", "satisfaction", "nps", "churn"],
    "AI for Data & Analytics":   ["data", "analytics", "extract", "etl", "reporting", "dashboard", "insight", "forecast", "prediction", "rag", "knowledge"],
    "AI for Operations":         ["operation", "process", "workflow", "maintenance", "grid", "supply", "logistics", "procurement", "inventory", "plant", "manufacturing"],
    "AI for Marketing & Sales":  ["marketing", "sales", "campaign", "acquisition", "lead", "content", "seo"],
}


def _classify_industry(title: str, description: str, kpi: str = "") -> str:
    haystack = f"{title} {description} {kpi}".lower()
    for industry, keywords in _INDUSTRY_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return industry
    return "General AI"


# Max rows to process in one preview request to avoid gateway timeouts (e.g. IIS 502.3)
PREVIEW_MAX_ROWS = 20


@router.post("/usecases/import/preview", response_model=List[Dict[str, Any]])
async def preview_import_use_cases(
    file: UploadFile = File(...),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload an Excel (.xlsx), Word (.docx), or PDF file containing use cases.
    Returns AI-enhanced previews with duplicate detection — nothing is saved yet.
    Limited to PREVIEW_MAX_ROWS per request to avoid proxy/gateway timeouts.
    Accepts an `offset` query param to paginate through large files in batches.
    """
    import logging
    from app.services.file_service import file_service
    from app.services.rag_service import rag_service

    logger = logging.getLogger(__name__)
    try:
        items, total_extracted = await _preview_import_use_cases_impl(
            file, db, file_service, rag_service, max_rows=PREVIEW_MAX_ROWS, offset=offset
        )
        headers = {
            "X-Total-Extracted": str(total_extracted),
            "X-Preview-Limit": str(PREVIEW_MAX_ROWS),
            "X-Batch-Offset": str(offset),
        }
        return JSONResponse(content=items, headers=headers)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Use case import preview failed")
        raise HTTPException(status_code=500, detail=str(exc))


async def _preview_import_use_cases_impl(file, db, file_service, rag_service, max_rows: int = 20, offset: int = 0):
    # 1. Extract content from file
    try:
        extracted = await file_service.extract_text_from_file(file)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"File parsing failed: {exc}")

    # 2. Build a flat list of raw candidates
    raw_candidates: List[Dict[str, str]] = []

    if isinstance(extracted, dict) and extracted.get("type") == "tabular":
        # Excel/CSV: each row is already a structured dict
        for row in extracted.get("rows", []):
            raw_candidates.append({
                "title":             row.get("title", ""),
                "description":       row.get("description", ""),
                "proposed_solution": row.get("proposed_solution", ""),
                "kpi":               row.get("kpi", ""),
                "target_user":       row.get("target_user", ""),
                "category":          row.get("category", ""),
            })
    else:
        # Narrative (Word/PDF): use RAG to extract challenge cards
        narrative_text = extracted if isinstance(extracted, str) else ""
        if not narrative_text:
            raise HTTPException(status_code=400, detail="Could not extract text from file")
        challenge_cards = await rag_service.analyze_document_context(narrative_text)
        for card in challenge_cards:
            raw_candidates.append({
                "title":             card.get("title", ""),
                "description":       card.get("challenge_description", card.get("description", "")),
                "proposed_solution": "",
                "kpi":               "; ".join(card.get("success_criteria", [])),
                "target_user":       "",
                "category":          "",
            })

    if not raw_candidates:
        raise HTTPException(status_code=422, detail="No use cases could be extracted from the file")

    total_extracted = len(raw_candidates)
    raw_candidates = raw_candidates[offset:offset + max_rows]

    # 3. Fetch existing use cases (only id, title, description to avoid missing columns e.g. facilitator_group_id)
    use_cases_table = UseCase.__table__
    result = await db.execute(
        select(use_cases_table.c.id, use_cases_table.c.title, use_cases_table.c.description)
    )
    existing = [
        {"id": str(row[0]), "title": row[1] or "", "description": row[2] or ""}
        for row in result.all()
    ]

    # 4. Process each candidate
    preview_items: List[Dict[str, Any]] = []

    for candidate in raw_candidates:
        temp_id = str(uuid.uuid4())
        title = candidate.get("title", "")
        description = candidate.get("description", "")

        # Enhance via LLM
        try:
            enhanced = await rag_service.enhance_use_case(f"{title}\n\n{description}")
        except Exception:
            enhanced = {}

        refined_title       = enhanced.get("title",       enhanced.get("refined_title",       title))
        refined_description = enhanced.get("description", enhanced.get("refined_description", description))
        suggested_solution  = enhanced.get("solution",    enhanced.get("suggested_solution",  candidate.get("proposed_solution", "")))
        refined_kpi         = enhanced.get("kpi",         candidate.get("kpi", ""))

        # Auto-classify industry
        auto_industry = _classify_industry(refined_title, refined_description, refined_kpi)

        # Keep user-supplied category or let it be set by admin in review
        auto_category = candidate.get("category", "")

        # Duplicate check
        is_duplicate = False
        duplicate_of_title = None
        similarity_score = 0.0
        try:
            dup_result = await rag_service.check_duplicates(
                candidate_title=refined_title,
                candidate_desc=refined_description,
                existing_items=existing,
            )
            is_duplicate      = dup_result.get("is_duplicate", False)
            similarity_score  = dup_result.get("similarity_score", 0.0)
            dup_id            = dup_result.get("similar_to_id")
            if dup_id:
                match = next((e for e in existing if e["id"] == dup_id), None)
                duplicate_of_title = match["title"] if match else dup_result.get("similar_to_title")
        except Exception:
            pass

        preview_items.append({
            "temp_id": temp_id,
            "original": {
                "title":       title,
                "description": description,
            },
            "enhanced": {
                "title":             refined_title,
                "description":       refined_description,
                "proposed_solution": suggested_solution,
                "kpi":               refined_kpi,
                "target_user":       candidate.get("target_user", ""),
                "category":          auto_category,
            },
            "auto_industry":    auto_industry,
            "auto_category":    auto_category,
            "is_duplicate":     is_duplicate,
            "duplicate_of":     duplicate_of_title,
            "similarity_score": round(float(similarity_score), 2),
        })

    return preview_items, total_extracted


from pydantic import BaseModel

class ImportUseCaseItem(BaseModel):
    title: str
    description: str
    proposed_solution: Optional[str] = ""
    kpi: Optional[str] = ""
    target_user: Optional[str] = ""
    category: Optional[str] = ""

class ImportConfirmRequest(BaseModel):
    use_cases: List[ImportUseCaseItem]


@router.post("/usecases/import/confirm")
async def confirm_import_use_cases(
    data: ImportConfirmRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Save the admin-reviewed import batch.
    Use cases are created as standalone (no workshop), auto-approved, marked as facilitator-added.
    """
    if not data.use_cases:
        raise HTTPException(status_code=400, detail="No use cases provided")

    # One-time fix: clear any stale shared facilitator_group_id from previously imported
    # standalone use cases so they each appear as individual cards in the UI.
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(UseCase)
        .where(
            UseCase.workshop_id.is_(None),
            UseCase.added_by_facilitator == True,
            UseCase.facilitator_group_id.isnot(None),
        )
        .values(facilitator_group_id=None)
    )
    await db.flush()

    new_records = [
        UseCase(
            id=uuid.uuid4(),
            workshop_id=None,
            participant_id=None,
            added_by_facilitator=True,
            facilitator_group_id=None,  # standalone — no cross-workshop grouping needed
            title=uc.title,
            description=uc.description,
            proposed_solution=uc.proposed_solution or "",
            kpi=uc.kpi or "",
            target_user=uc.target_user or "",
            category=uc.category or "",
            status="APPROVED",
        )
        for uc in data.use_cases
    ]

    db.add_all(new_records)
    await db.commit()

    return {"imported": len(new_records)}



# ─────────────────────────────────────────────────────────────────────────────
# Knowledge Base → Use Cases Migration
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/knowledge-base/pending-migration")
async def get_pending_migration_count(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Return pending KB use case count.
    Uses a count heuristic: if standalone imported use cases (no workshop)
    already cover the KB total, migration is considered complete.
    """
    from app.models.knowledge_base import KBUseCase

    kb_count_result = await db.execute(
        select(func.count(KBUseCase.id)).where(KBUseCase.is_active == True)
    )
    kb_total = kb_count_result.scalar() or 0

    if kb_total == 0:
        return {"kb_total": 0}

    # Count standalone (admin-imported, no workshop) use cases already in main table
    standalone_result = await db.execute(
        select(func.count(UseCase.id)).where(
            UseCase.workshop_id.is_(None),
            UseCase.added_by_facilitator == True,
        )
    )
    standalone_count = standalone_result.scalar() or 0

    # If standalone count >= KB count, migration is done
    pending = max(0, kb_total - standalone_count)
    return {"kb_total": pending}


@router.post("/knowledge-base/migrate-usecases")
async def migrate_kb_usecases_to_usecases(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Migrate all active KBUseCase records into the main use_cases table.
    Each record is enhanced via LLM, auto-classified by industry, and inserted
    as a standalone (no workshop) approved use case.
    Already-migrated titles are skipped to avoid duplicates.
    """
    from app.models.knowledge_base import KBUseCase, KBIndustry
    from app.services.rag_service import rag_service

    kb_result = await db.execute(
        select(KBUseCase, KBIndustry)
        .join(KBIndustry, KBUseCase.industry_id == KBIndustry.id)
        .where(KBUseCase.is_active == True)
        .order_by(KBUseCase.created_at)
    )
    kb_rows = kb_result.all()

    if not kb_rows:
        return {"migrated": 0, "skipped": 0, "message": "No KB use cases found"}

    existing_result = await db.execute(select(UseCase.title))
    existing_titles = {row[0].lower().strip() for row in existing_result.all() if row[0]}

    # Also add all original KB titles so re-runs skip them even if LLM changed the title
    for kb_uc, _ in kb_rows:
        if kb_uc.title:
            existing_titles.add(kb_uc.title.lower().strip())

    # Re-build without KB titles so we can check properly below
    # (We snapshot KB titles separately for the skip check)
    kb_original_titles = {(kb_uc.title or "").lower().strip() for kb_uc, _ in kb_rows}

    # Standalone use cases already imported (count-based guard)
    standalone_result = await db.execute(
        select(func.count(UseCase.id)).where(
            UseCase.workshop_id.is_(None),
            UseCase.added_by_facilitator == True,
        )
    )
    standalone_count = standalone_result.scalar() or 0

    # Fix any previously-migrated records that share a facilitator_group_id
    # (old bug: all records got the same group_id causing them to collapse into one card).
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(UseCase)
        .where(
            UseCase.workshop_id.is_(None),
            UseCase.added_by_facilitator == True,
            UseCase.facilitator_group_id.isnot(None),
        )
        .values(facilitator_group_id=None)
    )
    await db.commit()

    if standalone_count >= len(kb_rows):
        return {
            "migrated": 0,
            "skipped": len(kb_rows),
            "message": f"All {len(kb_rows)} KB use cases already migrated. Nothing to do.",
        }

    migrated, skipped = 0, 0
    new_records: List[UseCase] = []

    for kb_uc, kb_industry in kb_rows:
        title = kb_uc.title or ""
        description = kb_uc.description or ""

        # Skip if original KB title is already in use_cases (either as-is or LLM-enhanced)
        if title.lower().strip() in existing_titles:
            skipped += 1
            continue

        kpi_text = "; ".join(kb_uc.example_kpis or [])
        combined = f"{title}\n\n{description}"
        if kpi_text:
            combined += f"\n\nKPIs: {kpi_text}"

        try:
            enhanced = await rag_service.enhance_use_case(combined)
        except Exception:
            enhanced = {}

        refined_title       = enhanced.get("title",       enhanced.get("refined_title",       title))
        refined_description = enhanced.get("description", enhanced.get("refined_description", description))
        suggested_solution  = enhanced.get("solution",    enhanced.get("suggested_solution",  ""))
        refined_kpi         = enhanced.get("kpi",         kpi_text)

        kb_industry_name = kb_industry.name if kb_industry else ""
        auto_industry = _classify_industry(refined_title, refined_description, refined_kpi)
        if kb_industry_name:
            match = next(
                (ind for ind in _INDUSTRY_KEYWORDS
                 if kb_industry_name.lower() in ind.lower() or ind.lower() in kb_industry_name.lower()),
                None,
            )
            if match:
                auto_industry = match

        kb_category = kb_uc.category or (", ".join(kb_uc.technologies or [])[:100] or "")

        new_records.append(UseCase(
            id=uuid.uuid4(),
            workshop_id=None,
            participant_id=None,
            added_by_facilitator=True,
            facilitator_group_id=None,
            title=refined_title or title or "Untitled",
            description=refined_description or description or "No description",
            proposed_solution=suggested_solution or "",
            kpi=refined_kpi or "",
            target_user="",
            category=kb_category or "",
            status="APPROVED",
        ))
        existing_titles.add(refined_title.lower().strip())
        migrated += 1

    if new_records:
        db.add_all(new_records)
        await db.commit()

    return {
        "migrated": migrated,
        "skipped": skipped,
        "group_id": str(group_id),
        "message": f"Migrated {migrated} use cases from Knowledge Base. Skipped {skipped} duplicates.",
    }
