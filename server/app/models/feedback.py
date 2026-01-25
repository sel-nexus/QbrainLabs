"""
Feedback and Onboarding Models

This module defines database models for user feedback collection,
onboarding progress tracking, and help system.
"""

from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class FeedbackType(str, Enum):
    """Types of feedback"""
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    IMPROVEMENT = "improvement"
    GENERAL = "general"
    CRITICAL = "critical"


class FeedbackStatus(str, Enum):
    """Status of feedback"""
    NEW = "new"
    REVIEWING = "reviewing"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Feedback(Base):
    """User feedback and suggestions"""
    __tablename__ = "feedback"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    type = Column(SQLEnum(FeedbackType), nullable=False, default=FeedbackType.GENERAL)
    status = Column(SQLEnum(FeedbackStatus), nullable=False, default=FeedbackStatus.NEW)
    
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50))  # e.g., "workshop", "analytics", "ui"
    
    # Context information
    page_url = Column(String(500))
    browser_info = Column(JSONType)
    screenshot_url = Column(String(500))
    
    # Priority and impact
    priority = Column(Integer, default=3)  # 1=low, 5=critical
    impact_score = Column(Integer)  # Number of users affected
    
    # Admin response
    admin_response = Column(Text)
    admin_notes = Column(Text)
    assigned_to = Column(GUID(), ForeignKey("users.id"))
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="feedback_submitted")
    assignee = relationship("User", foreign_keys=[assigned_to])


class OnboardingProgress(Base):
    """Track user onboarding progress"""
    __tablename__ = "onboarding_progress"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), unique=True, nullable=False)
    
    # Onboarding steps completed
    steps_completed = Column(JSONType, default=list)  # List of step IDs
    current_step = Column(String(50))
    
    # Feature tours completed
    tours_completed = Column(JSONType, default=list)  # List of tour IDs
    
    # Progress metrics
    workshops_created = Column(Integer, default=0)
    participants_invited = Column(Integer, default=0)
    surveys_created = Column(Integer, default=0)
    
    # Flags
    is_completed = Column(Boolean, default=False)
    skip_onboarding = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    user = relationship("User", backref="onboarding_progress_rel")


class HelpArticle(Base):
    """Help center articles and documentation"""
    __tablename__ = "help_articles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Content
    title = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False)
    content = Column(Text, nullable=False)
    excerpt = Column(String(500))
    
    # Organization
    category = Column(String(50), nullable=False)  # e.g., "getting-started", "workshops", "analytics"
    subcategory = Column(String(50))
    tags = Column(JSONType, default=list)
    
    # Metadata
    author_id = Column(GUID(), ForeignKey("users.id"))
    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    
    # SEO
    meta_description = Column(String(300))
    keywords = Column(JSONType, default=list)
    
    # Analytics
    view_count = Column(Integer, default=0)
    helpful_count = Column(Integer, default=0)
    not_helpful_count = Column(Integer, default=0)
    
    # Ordering
    sort_order = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)
    
    # Relationships
    author = relationship("User")


class Tooltip(Base):
    """Contextual tooltips and help hints"""
    __tablename__ = "tooltips"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Identification
    element_id = Column(String(100), unique=True, nullable=False)  # e.g., "create-workshop-btn"
    page = Column(String(100), nullable=False)  # e.g., "dashboard", "workshop-detail"
    
    # Content
    title = Column(String(100))
    content = Column(Text, nullable=False)
    
    # Display settings
    position = Column(String(20), default="top")  # top, bottom, left, right
    trigger = Column(String(20), default="hover")  # hover, click, focus
    is_active = Column(Boolean, default=True)
    
    # Targeting
    user_roles = Column(JSONType, default=list)  # Empty = all roles
    show_for_new_users_only = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserTour(Base):
    """Interactive product tours"""
    __tablename__ = "user_tours"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Tour details
    name = Column(String(100), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Tour steps (JSONB array of step objects)
    steps = Column(JSONType, nullable=False)
    
    # Targeting
    target_page = Column(String(100))
    target_roles = Column(JSONType, default=list)
    
    # Settings
    is_active = Column(Boolean, default=True)
    is_required = Column(Boolean, default=False)
    auto_start = Column(Boolean, default=False)
    
    # Ordering
    sort_order = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserTourProgress(Base):
    """Track individual user progress through tours"""
    __tablename__ = "user_tour_progress"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    tour_id = Column(GUID(), ForeignKey("user_tours.id"), nullable=False)
    
    # Progress
    current_step = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    is_skipped = Column(Boolean, default=False)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    last_viewed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    tour = relationship("UserTour")
