"""
Organization Models for Multi-Tenancy Support
Enables organization-level management, branding, and user grouping
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class OrganizationTier(str):
    FREE = "FREE"
    STARTER = "STARTER"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"


class Organization(Base):
    """
    Organization model for multi-tenancy support.
    Organizations can have multiple users, workshops, and custom branding.
    """
    __tablename__ = "organizations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#6366f1")  # Hex color
    secondary_color = Column(String(7), default="#8b5cf6")
    
    # Contact Info
    contact_email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)
    industry = Column(String(100), nullable=True)
    
    # Subscription & Limits
    tier = Column(String(20), default=OrganizationTier.FREE)
    max_users = Column(Integer, default=5)
    max_workshops_per_month = Column(Integer, default=3)
    max_participants_per_workshop = Column(Integer, default=25)
    
    # Features
    settings = Column(JSONType, default={})
    features_enabled = Column(JSONType, default=[])  # List of enabled feature flags
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    members = relationship("OrganizationMember", back_populates="organization", cascade="all, delete-orphan")
    invitations = relationship("OrganizationInvitation", back_populates="organization", cascade="all, delete-orphan")


class OrganizationRole(str):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class OrganizationMember(Base):
    """
    Links users to organizations with role-based access control.
    """
    __tablename__ = "organization_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    role = Column(String(20), default=OrganizationRole.MEMBER)
    title = Column(String(100), nullable=True)  # Job title
    department = Column(String(100), nullable=True)
    
    # Permissions (can override role defaults)
    can_create_workshops = Column(Boolean, default=True)
    can_manage_templates = Column(Boolean, default=False)
    can_invite_members = Column(Boolean, default=False)
    can_view_analytics = Column(Boolean, default=True)
    can_export_data = Column(Boolean, default=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="members")
    user = relationship("User", backref="organization_memberships")


class OrganizationInvitation(Base):
    """
    Pending invitations to join an organization.
    """
    __tablename__ = "organization_invitations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    
    email = Column(String(255), nullable=False)
    role = Column(String(20), default=OrganizationRole.MEMBER)
    
    invited_by_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    invitation_token = Column(String(100), unique=True, nullable=False)
    
    # Status
    status = Column(String(20), default="PENDING")  # PENDING, ACCEPTED, EXPIRED, REVOKED
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    
    # Relationships
    organization = relationship("Organization", back_populates="invitations")
    invited_by = relationship("User", foreign_keys=[invited_by_id])


class OrganizationWorkshop(Base):
    """
    Links workshops to organizations for tracking and analytics.
    """
    __tablename__ = "organization_workshops"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    
    # Categorization
    department = Column(String(100), nullable=True)
    project = Column(String(255), nullable=True)
    tags = Column(JSONType, default=[])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization")
    workshop = relationship("Workshop")


class OrganizationUsageLog(Base):
    """
    Tracks organization usage for billing and analytics.
    """
    __tablename__ = "organization_usage_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    
    # Usage metrics
    month = Column(String(7), nullable=False)  # Format: YYYY-MM
    workshops_created = Column(Integer, default=0)
    total_participants = Column(Integer, default=0)
    total_use_cases = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    ai_enhancements_used = Column(Integer, default=0)
    storage_used_mb = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
