"""
Admin-specific Pydantic schemas
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


class WorkshopListItem(BaseModel):
    """Workshop summary for admin list view"""
    id: str
    title: str
    facilitator_id: str
    facilitator_name: Optional[str] = None
    status: str
    current_phase: str
    pin: Optional[str] = None
    participant_count: int = 0
    use_case_count: int = 0
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class SystemStats(BaseModel):
    """System-wide statistics for admin dashboard"""
    total_workshops: int
    total_users: int
    total_participants: int
    active_workshops: int
    workshops_today: int
    workshops_this_week: int
    workshops_this_month: int


class UserListItem(BaseModel):
    """User summary for admin list view"""
    id: str
    email: str
    full_name: Optional[str] = None
    is_admin: bool
    workshop_count: int = 0
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Schema for admin-initiated user creation"""
    email: EmailStr
    full_name: str
    is_admin: bool = False
    password: Optional[str] = None  # If None, generate random password


class WorkshopStatusUpdate(BaseModel):
    """Schema for updating workshop status"""
    status: str  # DRAFT, OPEN, IN_PROGRESS, COMPLETED, REJECTED


class UserUpdateByAdmin(BaseModel):
    """Schema for admin updating user details"""
    full_name: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None


class AdminResetPasswordRequest(BaseModel):
    """Schema for admin resetting a user's password"""
    new_password: str


class AdminResetPasswordResponse(BaseModel):
    """Response after admin resets a user's password"""
    message: str
    email: str


class UserDeletionImpact(BaseModel):
    """Impact analysis for deleting a user"""
    workshops_owned: int
    surveys_created: int
    templates_created: int
    marketplace_templates: int
    challenges_created: int
    last_active_at: Optional[datetime] = None
    has_recent_activity: bool = False  # E.g., in last 30 days
    warning_message: Optional[str] = None


# LLM Usage Schemas
class LLMUsageSummary(BaseModel):
    """Summary statistics for LLM usage"""
    total_calls: int
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    estimated_cost_cents: int
    unique_users: int
    unique_workshops: int
    success_count: int = 0
    error_count: int = 0


class LLMUsageByFeature(BaseModel):
    """LLM usage grouped by feature"""
    feature: str
    call_count: int
    total_tokens: int
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    estimated_cost_cents: int
    success_count: int = 0
    error_count: int = 0


class LLMUsageByWorkshop(BaseModel):
    """LLM usage grouped by workshop"""
    workshop_id: str
    workshop_title: Optional[str] = None
    call_count: int
    total_tokens: int
    estimated_cost_cents: int


class LLMUsageByUser(BaseModel):
    """LLM usage grouped by user"""
    user_id: str
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    call_count: int
    total_tokens: int
    estimated_cost_cents: int


class LLMUsageByModel(BaseModel):
    """LLM usage grouped by model name"""
    model_name: str
    call_count: int
    total_tokens: int
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    estimated_cost_cents: int
    success_count: int = 0
    error_count: int = 0


class LLMUsageByDay(BaseModel):
    """LLM usage aggregated by day"""
    date: str  # YYYY-MM-DD
    call_count: int
    total_tokens: int
    estimated_cost_cents: int


class LLMRecentLog(BaseModel):
    """Individual LLM usage log entry"""
    id: str
    feature: str
    model_name: Optional[str] = None
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost_cents: int
    success: str
    workshop_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime
