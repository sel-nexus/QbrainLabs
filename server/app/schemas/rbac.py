"""
RBAC Schemas for User Roles & Access Control
Implements US30: User Roles & Access Control System
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRoleEnum(str, Enum):
    ADMIN = "admin"
    FACILITATOR = "facilitator"
    MEMBER = "member"


class AccountStatusEnum(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    DISABLED = "disabled"
    SUSPENDED = "suspended"


# ============== Facilitator Registration ==============

class FacilitatorRegisterRequest(BaseModel):
    """Request for facilitator registration (pending admin approval)"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    organization: Optional[str] = Field(None, max_length=255)
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class FacilitatorResponse(BaseModel):
    """Response for facilitator data"""
    id: str
    email: str
    full_name: str
    organization: Optional[str] = None
    role: str
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None
    workshop_count: int = 0
    
    class Config:
        from_attributes = True


class FacilitatorListResponse(BaseModel):
    """List of facilitators for admin view"""
    facilitators: List[FacilitatorResponse]
    total: int
    pending_count: int


# ============== Facilitator Management (Admin) ==============

class FacilitatorStatusUpdate(BaseModel):
    """Request to update facilitator status"""
    status: AccountStatusEnum


class FacilitatorApprovalRequest(BaseModel):
    """Request to approve or reject facilitator registration"""
    approved: bool
    rejection_reason: Optional[str] = None


# ============== Workshop Facilitator Assignment ==============

class WorkshopAssignmentRequest(BaseModel):
    """Request to assign facilitator to workshop"""
    facilitator_id: str
    can_edit: bool = True
    can_delete: bool = False


class WorkshopAssignmentResponse(BaseModel):
    """Response for workshop assignment"""
    id: str
    workshop_id: str
    workshop_title: str
    workshop_pin: Optional[str]
    facilitator_id: str
    facilitator_name: str
    facilitator_email: str
    assigned_by: str
    assigned_at: datetime
    can_edit: bool
    can_delete: bool
    
    class Config:
        from_attributes = True


class FacilitatorWorkshopListItem(BaseModel):
    """Workshop item for facilitator's assigned workshops list"""
    id: str
    title: str
    pin: Optional[str]
    status: str
    current_phase: str
    participant_count: int
    use_case_count: int
    created_at: datetime
    can_edit: bool
    can_delete: bool
    
    class Config:
        from_attributes = True


# ============== Member Session ==============

class MemberJoinRequest(BaseModel):
    """Request for member to join workshop via PIN"""
    pin: str = Field(..., min_length=6, max_length=6)
    display_name: str = Field(..., min_length=2, max_length=100)


class MemberSessionResponse(BaseModel):
    """Response for member session"""
    session_id: str
    session_token: str
    workshop_id: str
    workshop_title: str
    display_name: str
    participant_id: str
    expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MemberWorkshopInfo(BaseModel):
    """Workshop info visible to members"""
    id: str
    title: str
    status: str
    current_phase: str
    
    class Config:
        from_attributes = True


# ============== Auth Responses (Extended) ==============

class UserWithRoleResponse(BaseModel):
    """Extended user response with role information"""
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    status: str
    is_admin: bool = False
    organization: Optional[str] = None
    mfa_enabled: bool = False
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class TokenWithRoleResponse(BaseModel):
    """Token response with role information"""
    access_token: str
    token_type: str = "bearer"
    user: UserWithRoleResponse
    assigned_workshops: List[str] = []  # List of workshop IDs user can access


# ============== Audit Log ==============

class AuditLogEntry(BaseModel):
    """Audit log entry for role changes"""
    id: str
    user_id: Optional[str]
    user_email: Optional[str]
    action: str
    performed_by: Optional[str]
    performer_email: Optional[str]
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    ip_address: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """List of audit log entries"""
    entries: List[AuditLogEntry]
    total: int


# ============== Permission Check ==============

class PermissionCheckRequest(BaseModel):
    """Request to check if user has permission"""
    resource: str
    action: str


class PermissionCheckResponse(BaseModel):
    """Response for permission check"""
    allowed: bool
    role: str
    resource: str
    action: str


# ============== US32: Rate Limiting ==============

class RateLimitStatus(BaseModel):
    """Rate limit status for a single time window"""
    count: int
    limit: int
    reset_at: datetime


class RegistrationRateLimitResponse(BaseModel):
    """Response for registration rate limit status"""
    daily: RateLimitStatus
    weekly: RateLimitStatus
    monthly: RateLimitStatus


class RateLimitResetRequest(BaseModel):
    """Request to reset rate limits"""
    period: str = Field(..., pattern="^(daily|weekly|monthly|all)$")


class RateLimitExceededResponse(BaseModel):
    """Response when rate limit is exceeded"""
    error: str = "REGISTRATION_RATE_LIMIT_EXCEEDED"
    message: str = "Maximum facilitator registrations reached for this period."
    limit_type: str
    limit: int
    current_count: int
    reset_at: datetime
    next_available_in_seconds: int


# ============== US32: Facilitator Access Requests ==============

class FacilitatorAccessRequestCreate(BaseModel):
    """Request to create facilitator access request via PIN"""
    name: str = Field(..., min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    session_id: Optional[str] = None


class FacilitatorAccessRequestResponse(BaseModel):
    """Response for facilitator access request"""
    id: str
    request_id: str
    workshop_id: str
    workshop_title: str
    workshop_pin: Optional[str]
    requester_name: str
    requester_email: Optional[str]
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    current_facilitator_count: int = 0
    max_facilitators: int = 10

    class Config:
        from_attributes = True


class FacilitatorAccessRequestListResponse(BaseModel):
    """List of facilitator access requests"""
    requests: List[FacilitatorAccessRequestResponse]
    total: int
    pending_count: int


class FacilitatorAccessApproveRequest(BaseModel):
    """Request to approve facilitator access"""
    notes: Optional[str] = None


class FacilitatorAccessRejectRequest(BaseModel):
    """Request to reject facilitator access"""
    reason: Optional[str] = None


class FacilitatorAccessSubmitResponse(BaseModel):
    """Response after submitting facilitator access request"""
    request_id: str
    status: str
    message: str


# ============== US32: Workshop Facilitator Management ==============

class WorkshopFacilitatorsResponse(BaseModel):
    """Response for workshop facilitators with count"""
    workshop_id: str
    workshop_title: str
    facilitators: List[WorkshopAssignmentResponse]
    count: int
    max_count: int = 10
    can_add_more: bool
