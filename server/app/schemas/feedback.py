from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, HttpUrl

from app.models.feedback import FeedbackType, FeedbackStatus


# Feedback Schemas
class FeedbackBase(BaseModel):
    type: FeedbackType = FeedbackType.GENERAL
    title: str
    description: str
    category: Optional[str] = None
    page_url: Optional[str] = None
    browser_info: Optional[Dict[str, Any]] = None
    screenshot_url: Optional[str] = None
    priority: Optional[int] = 3


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackUpdate(BaseModel):
    status: Optional[FeedbackStatus] = None
    priority: Optional[int] = None
    admin_response: Optional[str] = None
    admin_notes: Optional[str] = None
    assigned_to: Optional[UUID] = None


class FeedbackResponse(FeedbackBase):
    id: UUID
    user_id: UUID
    status: FeedbackStatus
    impact_score: Optional[int] = None
    admin_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Onboarding Schemas
class OnboardingStep(BaseModel):
    step_id: str
    completed_at: datetime = datetime.utcnow()


class OnboardingProgressUpdate(BaseModel):
    step_id: Optional[str] = None
    tour_id: Optional[str] = None
    skip_onboarding: Optional[bool] = None


class OnboardingProgressResponse(BaseModel):
    id: UUID
    user_id: UUID
    steps_completed: List[str]
    current_step: Optional[str]
    tours_completed: List[str]
    workshops_created: int
    participants_invited: int
    surveys_created: int
    is_completed: bool
    skip_onboarding: bool
    started_at: datetime
    completed_at: Optional[datetime]
    last_activity: datetime

    class Config:
        from_attributes = True


# Help Article Schemas
class HelpArticleBase(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    tags: List[str] = []
    meta_description: Optional[str] = None
    keywords: List[str] = []
    sort_order: int = 0
    is_published: bool = False
    is_featured: bool = False


class HelpArticleCreate(HelpArticleBase):
    pass


class HelpArticleUpdate(HelpArticleBase):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class HelpArticleResponse(HelpArticleBase):
    id: UUID
    author_id: Optional[UUID]
    view_count: int
    helpful_count: int
    not_helpful_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime]

    class Config:
        from_attributes = True


# Tooltip Schemas
class TooltipBase(BaseModel):
    element_id: str
    page: str
    title: Optional[str] = None
    content: str
    position: str = "top"
    trigger: str = "hover"
    is_active: bool = True
    user_roles: List[str] = []
    show_for_new_users_only: bool = False


class TooltipCreate(TooltipBase):
    pass


class TooltipResponse(TooltipBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# User Tour Schemas
class TourStep(BaseModel):
    id: str
    title: str
    content: str
    target: str  # CSS selector
    placement: str = "bottom"
    disable_beacon: bool = False


class UserTourBase(BaseModel):
    name: str
    title: str
    description: Optional[str] = None
    steps: List[TourStep]
    target_page: Optional[str] = None
    target_roles: List[str] = []
    is_active: bool = True
    is_required: bool = False
    auto_start: bool = False
    sort_order: int = 0


class UserTourCreate(UserTourBase):
    pass


class UserTourResponse(UserTourBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
