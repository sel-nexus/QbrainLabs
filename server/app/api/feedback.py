from typing import List, Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_
from app.core.database import get_db
from app.models.models import User
from app.models.feedback import (
    Feedback, FeedbackStatus, OnboardingProgress, 
    HelpArticle, Tooltip, UserTour, UserTourProgress
)
from app.schemas.feedback import (
    FeedbackCreate, FeedbackUpdate, FeedbackResponse,
    OnboardingProgressResponse, OnboardingProgressUpdate,
    HelpArticleCreate, HelpArticleUpdate, HelpArticleResponse,
    TooltipCreate, TooltipResponse,
    UserTourCreate, UserTourResponse
)
from app.api.auth import get_current_user
from app.middleware.admin_auth import require_admin

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# --- Feedback Endpoints ---

@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    feedback_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a new feedback item"""
    feedback = Feedback(
        **feedback_in.dict(),
        user_id=current_user.id
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("/feedback/my", response_model=List[FeedbackResponse])
async def get_my_feedback(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback submitted by the current user"""
    query = select(Feedback).where(Feedback.user_id == current_user.id)\
        .order_by(desc(Feedback.created_at))\
        .offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/admin/feedback", response_model=List[FeedbackResponse])
async def get_all_feedback(
    status: Optional[FeedbackStatus] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get all feedback items with filtering"""
    query = select(Feedback).order_by(desc(Feedback.created_at))
    
    if status:
        query = query.where(Feedback.status == status)
    if category:
        query = query.where(Feedback.category == category)
        
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/admin/feedback/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback_status(
    feedback_id: UUID,
    feedback_update: FeedbackUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Update feedback status and response"""
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback item not found" 
        )
        
    for field, value in feedback_update.dict(exclude_unset=True).items():
        setattr(feedback, field, value)
        
    if feedback_update.status in [FeedbackStatus.RESOLVED, FeedbackStatus.CLOSED] and not feedback.resolved_at:
        feedback.resolved_at = datetime.utcnow()
        
    await db.commit()
    await db.refresh(feedback)
    return feedback


# --- Onboarding Endpoints ---

@router.get("/onboarding/progress", response_model=OnboardingProgressResponse)
async def get_onboarding_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's onboarding progress"""
    result = await db.execute(select(OnboardingProgress).where(OnboardingProgress.user_id == current_user.id))
    progress = result.scalar_one_or_none()
    
    if not progress:
        # Create initial record if it doesn't exist
        progress = OnboardingProgress(user_id=current_user.id)
        db.add(progress)
        await db.commit()
        await db.refresh(progress)
        
    return progress


@router.put("/onboarding/progress", response_model=OnboardingProgressResponse)
async def update_onboarding_progress(
    progress_update: OnboardingProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update onboarding progress (complete step, finish tour, etc)"""
    result = await db.execute(select(OnboardingProgress).where(OnboardingProgress.user_id == current_user.id))
    progress = result.scalar_one_or_none()
    
    if not progress:
        progress = OnboardingProgress(user_id=current_user.id)
        db.add(progress)
    
    if progress_update.step_id:
        current_steps = list(progress.steps_completed)
        if progress_update.step_id not in current_steps:
            current_steps.append(progress_update.step_id)
            progress.steps_completed = current_steps
            progress.current_step = progress_update.step_id
            
    if progress_update.tour_id:
        current_tours = list(progress.tours_completed)
        if progress_update.tour_id not in current_tours:
            current_tours.append(progress_update.tour_id)
            progress.tours_completed = current_tours
            
    if progress_update.skip_onboarding is not None:
        progress.skip_onboarding = progress_update.skip_onboarding
        if progress_update.skip_onboarding:
            progress.is_completed = True
            progress.completed_at = datetime.utcnow()
            
    progress.last_activity = datetime.utcnow()
    
    await db.commit()
    await db.refresh(progress)
    return progress


# --- Help Center Endpoints ---

@router.get("/help/articles", response_model=List[HelpArticleResponse])
async def get_help_articles(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get published help articles"""
    query = select(HelpArticle).where(HelpArticle.is_published == True)
    
    if category:
        query = query.where(HelpArticle.category == category)
        
    if search:
        # Simple case-insensitive search
        search_term = f"%{search}%"
        query = query.where(
            or_(
                HelpArticle.title.ilike(search_term),
                HelpArticle.content.ilike(search_term),
                HelpArticle.excerpt.ilike(search_term)
            )
        )
        
    query = query.order_by(HelpArticle.sort_order, desc(HelpArticle.published_at))
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/help/articles/{slug}", response_model=HelpArticleResponse)
async def get_help_article(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific help article by slug"""
    result = await db.execute(select(HelpArticle).where(HelpArticle.slug == slug))
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
        
    # Increment view count
    article.view_count += 1
    await db.commit()
    await db.refresh(article)
    
    return article


# --- Tooltips & Tours Endpoints ---

@router.get("/frontend/tooltips", response_model=List[TooltipResponse])
async def get_page_tooltips(
    page: str,
    db: AsyncSession = Depends(get_db)
):
    """Get active tooltips for a specific page"""
    query = select(Tooltip).where(
        Tooltip.page == page,
        Tooltip.is_active == True
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/frontend/tours", response_model=List[UserTourResponse])
async def get_active_tours(
    page: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get active tours available for the user"""
    # First check usage progress to filter out completed tours if auto_start is true?
    # For now, just return all active tours for the page
    query = select(UserTour).where(UserTour.is_active == True)
    
    if page:
        query = query.where(UserTour.target_page == page)
        
    query = query.order_by(UserTour.sort_order)
    
    result = await db.execute(query)
    return result.scalars().all()
