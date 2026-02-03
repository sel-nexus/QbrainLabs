"""
Notifications API Endpoints
Handles system notifications for knowledge imports and use case updates
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User
from app.models.notification import Notification, NotificationStatus, NotificationType
from app.models.knowledge_article import UseCaseKnowledgeLink
from app.models.knowledge_base import KBUseCase
from pydantic import BaseModel

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    notification_type: str
    title: str
    message: str
    data: dict
    status: str
    priority: str
    action_url: Optional[str]
    created_at: str
    read_at: Optional[str]
    acted_at: Optional[str]
    is_unread: bool
    is_pending: bool

class NotificationStats(BaseModel):
    total: int
    unread: int
    pending: int


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    status: Optional[str] = None,
    notification_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get notifications for the current user.
    """
    query = select(Notification).where(Notification.user_id == current_user.id)
    
    if status:
        query = query.where(Notification.status == status)
    
    if notification_type:
        query = query.where(Notification.notification_type == notification_type)
    
    query = query.offset(skip).limit(limit).order_by(Notification.created_at.desc())
    
    result = await db.execute(query)
    notifications = result.scalars().all()
    
    return [
        NotificationResponse(
            **notif.to_dict(),
            is_unread=notif.is_unread,
            is_pending=notif.is_pending
        )
        for notif in notifications
    ]


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get notification statistics for the current user.
    """
    # Total notifications
    total_result = await db.execute(
        select(func.count(Notification.id)).where(Notification.user_id == current_user.id)
    )
    total = total_result.scalar() or 0
    
    # Unread notifications
    unread_result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.read_at == None
            )
        )
    )
    unread = unread_result.scalar() or 0
    
    # Pending notifications
    pending_result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.status == NotificationStatus.PENDING
            )
        )
    )
    pending = pending_result.scalar() or 0
    
    return NotificationStats(
        total=total,
        unread=unread,
        pending=pending
    )


@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a notification as read.
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.read_at is None:
        notification.read_at = datetime.utcnow()
        await db.commit()
    
    return {"message": "Notification marked as read"}


@router.post("/{notification_id}/approve")
async def approve_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a notification and apply suggested changes to use cases.
    """
    # Get notification
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.status != NotificationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Notification is not pending")
    
    # Extract article ID from notification data
    article_id = notification.data.get("article_id")
    if not article_id:
        raise HTTPException(status_code=400, detail="Invalid notification data")
    
    # Get all pending links for this article
    links_result = await db.execute(
        select(UseCaseKnowledgeLink).where(
            and_(
                UseCaseKnowledgeLink.article_id == article_id,
                UseCaseKnowledgeLink.status == "pending"
            )
        )
    )
    links = links_result.scalars().all()
    
    # Apply changes to each use case
    updated_usecases = []
    for link in links:
        # Get use case
        uc_result = await db.execute(
            select(KBUseCase).where(KBUseCase.id == link.usecase_id)
        )
        usecase = uc_result.scalars().first()
        
        if usecase and link.suggested_changes:
            # Apply suggested changes
            changes = link.suggested_changes
            
            if "description" in changes:
                usecase.description = changes["description"]
            
            if "typical_roi" in changes:
                usecase.typical_roi = changes["typical_roi"]
            
            if "key_benefits" in changes:
                usecase.key_benefits = changes["key_benefits"]
            
            if "technologies" in changes:
                usecase.technologies = changes["technologies"]
            
            if "implementation_time" in changes:
                usecase.implementation_time = changes["implementation_time"]
            
            usecase.updated_at = datetime.utcnow()
            
            # Update link status
            link.status = "applied"
            link.applied_at = datetime.utcnow()
            link.applied_by = current_user.id
            
            updated_usecases.append({
                "id": str(usecase.id),
                "title": usecase.title,
                "impact_type": link.impact_type
            })
    
    # Update notification status
    notification.status = NotificationStatus.APPROVED
    notification.acted_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "message": "Changes approved and applied",
        "updated_usecases": updated_usecases
    }


@router.post("/{notification_id}/dismiss")
async def dismiss_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dismiss a notification without applying changes.
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Update notification status
    notification.status = NotificationStatus.DISMISSED
    notification.acted_at = datetime.utcnow()
    
    # Mark associated links as rejected
    if notification.data.get("article_id"):
        links_result = await db.execute(
            select(UseCaseKnowledgeLink).where(
                and_(
                    UseCaseKnowledgeLink.article_id == notification.data["article_id"],
                    UseCaseKnowledgeLink.status == "pending"
                )
            )
        )
        links = links_result.scalars().all()
        
        for link in links:
            link.status = "rejected"
    
    await db.commit()
    
    return {"message": "Notification dismissed"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a notification.
    """
    result = await db.execute(
        select(Notification).where(
            and_(
                Notification.id == notification_id,
                Notification.user_id == current_user.id
            )
        )
    )
    notification = result.scalars().first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()
    
    return {"message": "Notification deleted"}
