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
