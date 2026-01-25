"""
Role-Based Access Control (RBAC) Models
Implements US30: User Roles & Access Control System
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base
from app.models.models import GUID, JSONType


class UserRole(str, enum.Enum):
    """User role types"""
    ADMIN = "admin"
    FACILITATOR = "facilitator"
    MEMBER = "member"  # Members are session-based, not stored in users table


class AccountStatus(str, enum.Enum):
    """Account status for registered users"""
    PENDING = "pending"       # Awaiting admin approval
    ACTIVE = "active"         # Can login and use the system
    DISABLED = "disabled"     # Account disabled by admin
    SUSPENDED = "suspended"   # Temporarily suspended


class WorkshopFacilitator(Base):
    """
    Many-to-many relationship between workshops and facilitators.
    Allows admin to assign multiple facilitators to a workshop.
    """
    __tablename__ = "workshop_facilitators"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    facilitator_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)
    can_edit = Column(Boolean, default=True)
    can_delete = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint('workshop_id', 'facilitator_id', name='uq_workshop_facilitator'),
    )

    # Relationships
    workshop = relationship("Workshop", foreign_keys=[workshop_id], backref="facilitator_assignments")
    facilitator = relationship("User", foreign_keys=[facilitator_id], backref="workshop_assignments")
    assigner = relationship("User", foreign_keys=[assigned_by])


class MemberSession(Base):
    """
    Anonymous member sessions for PIN-based workshop access.
    Members don't have persistent accounts - sessions expire when browser closes.
    """
    __tablename__ = "member_sessions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    display_name = Column(String(100), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)  # Secure session identifier
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    is_active = Column(Boolean, default=True)

    # Link to participant record if needed
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=True)

    # Relationships
    workshop = relationship("Workshop", backref="member_sessions")
    participant = relationship("Participant", backref="member_session")


class Permission(Base):
    """
    Permission matrix defining what each role can do.
    Stored in database for flexibility and audit purposes.
    """
    __tablename__ = "permissions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    role = Column(String(20), nullable=False)  # admin, facilitator, member
    resource = Column(String(100), nullable=False)  # e.g., workshop, survey, use_case
    action = Column(String(50), nullable=False)  # e.g., create, read, update, delete, view_all
    allowed = Column(Boolean, default=False)

    __table_args__ = (
        UniqueConstraint('role', 'resource', 'action', name='uq_role_permission'),
    )


class RoleAuditLog(Base):
    """
    Audit log for tracking all role-related changes.
    Critical for security compliance and debugging.
    """
    __tablename__ = "role_audit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)  # Target user
    action = Column(String(100), nullable=False)  # e.g., role_change, status_change, login, logout
    performed_by = Column(GUID(), ForeignKey("users.id"), nullable=True)  # Who performed the action
    old_value = Column(JSONType, nullable=True)  # Previous state
    new_value = Column(JSONType, nullable=True)  # New state
    ip_address = Column(String(45))
    user_agent = Column(Text)
    details = Column(Text)  # Additional context
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    target_user = relationship("User", foreign_keys=[user_id], backref="audit_logs_received")
    performer = relationship("User", foreign_keys=[performed_by], backref="audit_logs_performed")


# Default permissions to be seeded
DEFAULT_PERMISSIONS = [
    # Workshop permissions
    {"role": "admin", "resource": "workshop", "action": "create", "allowed": True},
    {"role": "admin", "resource": "workshop", "action": "view_all", "allowed": True},
    {"role": "admin", "resource": "workshop", "action": "view_assigned", "allowed": True},
    {"role": "admin", "resource": "workshop", "action": "view_current", "allowed": True},
    {"role": "admin", "resource": "workshop", "action": "delete", "allowed": True},
    {"role": "admin", "resource": "workshop", "action": "archive", "allowed": True},
    
    {"role": "facilitator", "resource": "workshop", "action": "create", "allowed": False},
    {"role": "facilitator", "resource": "workshop", "action": "view_all", "allowed": False},
    {"role": "facilitator", "resource": "workshop", "action": "view_assigned", "allowed": True},
    {"role": "facilitator", "resource": "workshop", "action": "view_current", "allowed": True},
    {"role": "facilitator", "resource": "workshop", "action": "delete", "allowed": False},
    {"role": "facilitator", "resource": "workshop", "action": "archive", "allowed": True},
    
    {"role": "member", "resource": "workshop", "action": "create", "allowed": False},
    {"role": "member", "resource": "workshop", "action": "view_all", "allowed": False},
    {"role": "member", "resource": "workshop", "action": "view_assigned", "allowed": False},
    {"role": "member", "resource": "workshop", "action": "view_current", "allowed": True},
    {"role": "member", "resource": "workshop", "action": "delete", "allowed": False},
    {"role": "member", "resource": "workshop", "action": "archive", "allowed": False},
    
    # Facilitator management permissions
    {"role": "admin", "resource": "facilitator", "action": "create", "allowed": True},
    {"role": "admin", "resource": "facilitator", "action": "approve", "allowed": True},
    {"role": "admin", "resource": "facilitator", "action": "enable_disable", "allowed": True},
    {"role": "admin", "resource": "facilitator", "action": "assign_workshop", "allowed": True},
    
    {"role": "facilitator", "resource": "facilitator", "action": "create", "allowed": False},
    {"role": "facilitator", "resource": "facilitator", "action": "approve", "allowed": False},
    {"role": "facilitator", "resource": "facilitator", "action": "enable_disable", "allowed": False},
    {"role": "facilitator", "resource": "facilitator", "action": "assign_workshop", "allowed": False},
    
    # Survey permissions
    {"role": "admin", "resource": "survey", "action": "create", "allowed": True},
    {"role": "admin", "resource": "survey", "action": "respond", "allowed": True},
    {"role": "admin", "resource": "survey", "action": "view_results", "allowed": True},
    
    {"role": "facilitator", "resource": "survey", "action": "create", "allowed": True},
    {"role": "facilitator", "resource": "survey", "action": "respond", "allowed": True},
    {"role": "facilitator", "resource": "survey", "action": "view_results", "allowed": True},
    
    {"role": "member", "resource": "survey", "action": "create", "allowed": False},
    {"role": "member", "resource": "survey", "action": "respond", "allowed": True},
    {"role": "member", "resource": "survey", "action": "view_results", "allowed": False},
    
    # Use case permissions
    {"role": "admin", "resource": "use_case", "action": "submit", "allowed": True},
    {"role": "admin", "resource": "use_case", "action": "edit_any", "allowed": True},
    {"role": "admin", "resource": "use_case", "action": "delete", "allowed": True},
    
    {"role": "facilitator", "resource": "use_case", "action": "submit", "allowed": True},
    {"role": "facilitator", "resource": "use_case", "action": "edit_any", "allowed": True},
    {"role": "facilitator", "resource": "use_case", "action": "delete", "allowed": True},
    
    {"role": "member", "resource": "use_case", "action": "submit", "allowed": True},
    {"role": "member", "resource": "use_case", "action": "edit_any", "allowed": False},
    {"role": "member", "resource": "use_case", "action": "delete", "allowed": False},
    
    # Analytics permissions
    {"role": "admin", "resource": "analytics", "action": "system_wide", "allowed": True},
    {"role": "admin", "resource": "analytics", "action": "workshop", "allowed": True},
    
    {"role": "facilitator", "resource": "analytics", "action": "system_wide", "allowed": False},
    {"role": "facilitator", "resource": "analytics", "action": "workshop", "allowed": True},
    
    {"role": "member", "resource": "analytics", "action": "system_wide", "allowed": False},
    {"role": "member", "resource": "analytics", "action": "workshop", "allowed": False},
    
    # Settings permissions
    {"role": "admin", "resource": "settings", "action": "system", "allowed": True},
    {"role": "facilitator", "resource": "settings", "action": "system", "allowed": False},
    {"role": "member", "resource": "settings", "action": "system", "allowed": False},
]
