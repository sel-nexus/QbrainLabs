"""
Notification Models
System notifications for admins and facilitators
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class NotificationType(str):
    """Notification type constants"""
    KNOWLEDGE_IMPORT = "knowledge_import"
    USECASE_UPDATE = "usecase_update"
    VALIDATION_COMPLETE = "validation_complete"
    SYSTEM_ALERT = "system_alert"


class NotificationStatus(str):
    """Notification status constants"""
    PENDING = "pending"
    READ = "read"
    APPROVED = "approved"
    DISMISSED = "dismissed"


class Notification(Base):
    """
    System notifications for users.
    Primarily used for knowledge import and use case update approvals.
    """
    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Target user
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Notification details
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Additional context data (JSON)
    # For knowledge_import: {article_id, affected_usecases: [{id, title, changes}]}
    # For usecase_update: {usecase_id, article_id, changes}
    data = Column(JSONType, default=dict)
    
    # Status tracking
    status = Column(String(20), default=NotificationStatus.PENDING, nullable=False)
    
    # Priority
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Action URL (optional)
    action_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    read_at = Column(DateTime, nullable=True)
    acted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
    
    # Relationships
    user = relationship("User", backref="notifications")
    
    # Indexes
    __table_args__ = (
        Index("idx_notification_user", "user_id"),
        Index("idx_notification_status", "status"),
        Index("idx_notification_type", "notification_type"),
        Index("idx_notification_created", "created_at"),
        Index("idx_notification_user_status", "user_id", "status"),
    )

    def __repr__(self):
        return f"<Notification {self.notification_type} for user {self.user_id}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "notification_type": self.notification_type,
            "title": self.title,
            "message": self.message,
            "data": self.data or {},
            "status": self.status,
            "priority": self.priority,
            "action_url": self.action_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "acted_at": self.acted_at.isoformat() if self.acted_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }

    @property
    def is_unread(self) -> bool:
        """Check if notification is unread"""
        return self.read_at is None

    @property
    def is_pending(self) -> bool:
        """Check if notification requires action"""
        return self.status == NotificationStatus.PENDING

    @property
    def is_expired(self) -> bool:
        """Check if notification has expired"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
