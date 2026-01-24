"""
Organization Schemas for Multi-Tenancy API
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrganizationTier(str, Enum):
    FREE = "FREE"
    STARTER = "STARTER"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class OrganizationRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class InvitationStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


# Organization Schemas
class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=100, pattern="^[a-z0-9-]+$")
    description: Optional[str] = None
    industry: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    website: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    contact_email: Optional[EmailStr] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    settings: Optional[dict] = None


class OrganizationBranding(BaseModel):
    logo_url: Optional[str] = None
    primary_color: str = "#6366f1"
    secondary_color: str = "#8b5cf6"


class OrganizationLimits(BaseModel):
    max_users: int
    max_workshops_per_month: int
    max_participants_per_workshop: int
    current_users: int = 0
    workshops_this_month: int = 0


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: str
    secondary_color: str
    contact_email: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    tier: OrganizationTier
    is_active: bool
    is_verified: bool
    created_at: datetime
    member_count: int = 0
    workshop_count: int = 0

    class Config:
        from_attributes = True


class OrganizationDetailResponse(OrganizationResponse):
    limits: OrganizationLimits
    features_enabled: List[str] = []
    settings: dict = {}


class OrganizationListResponse(BaseModel):
    organizations: List[OrganizationResponse]
    total: int


# Member Schemas
class MemberPermissions(BaseModel):
    can_create_workshops: bool = True
    can_manage_templates: bool = False
    can_invite_members: bool = False
    can_view_analytics: bool = True
    can_export_data: bool = True


class MemberCreate(BaseModel):
    user_id: str
    role: OrganizationRole = OrganizationRole.MEMBER
    title: Optional[str] = None
    department: Optional[str] = None
    permissions: Optional[MemberPermissions] = None


class MemberUpdate(BaseModel):
    role: Optional[OrganizationRole] = None
    title: Optional[str] = None
    department: Optional[str] = None
    permissions: Optional[MemberPermissions] = None
    is_active: Optional[bool] = None


class MemberResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: str
    role: OrganizationRole
    title: Optional[str] = None
    department: Optional[str] = None
    permissions: MemberPermissions
    is_active: bool
    joined_at: datetime
    last_active_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MemberListResponse(BaseModel):
    members: List[MemberResponse]
    total: int


# Invitation Schemas
class InvitationCreate(BaseModel):
    email: EmailStr
    role: OrganizationRole = OrganizationRole.MEMBER
    message: Optional[str] = None


class InvitationResponse(BaseModel):
    id: str
    email: str
    role: OrganizationRole
    status: InvitationStatus
    invited_by_name: str
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class InvitationAccept(BaseModel):
    token: str


class InvitationListResponse(BaseModel):
    invitations: List[InvitationResponse]
    total: int


# Workshop Link Schemas
class OrganizationWorkshopCreate(BaseModel):
    workshop_id: str
    department: Optional[str] = None
    project: Optional[str] = None
    tags: List[str] = []


class OrganizationWorkshopResponse(BaseModel):
    id: str
    workshop_id: str
    workshop_title: str
    workshop_status: str
    department: Optional[str] = None
    project: Optional[str] = None
    tags: List[str] = []
    created_at: datetime
    participant_count: int = 0
    use_case_count: int = 0

    class Config:
        from_attributes = True


class OrganizationWorkshopListResponse(BaseModel):
    workshops: List[OrganizationWorkshopResponse]
    total: int


# Usage & Analytics Schemas
class OrganizationUsageResponse(BaseModel):
    month: str
    workshops_created: int
    total_participants: int
    total_use_cases: int
    total_votes: int
    ai_enhancements_used: int
    storage_used_mb: int


class OrganizationAnalytics(BaseModel):
    total_workshops: int
    total_participants: int
    total_use_cases: int
    total_votes: int
    active_members: int
    usage_trend: List[OrganizationUsageResponse]
    top_contributors: List[dict]
    department_breakdown: List[dict]


# Switch Organization Context
class SwitchOrganizationRequest(BaseModel):
    organization_id: str


class UserOrganizationsResponse(BaseModel):
    organizations: List[OrganizationResponse]
    current_organization_id: Optional[str] = None
