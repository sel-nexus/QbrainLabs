"""
Core Database Models - PostgreSQL Native
US33: Migrated to PostgreSQL with native types (JSONB, VARCHAR(36) for UUIDs).
"""
from sqlalchemy import Column, String, Boolean, ForeignKey, Enum, Text, DateTime, Index
from sqlalchemy.types import TypeDecorator, CHAR, String as SAString
from sqlalchemy.dialects.postgresql import JSONB as PGJSONB, TIMESTAMP
from datetime import datetime
import json
import uuid


class GUID(TypeDecorator):
    """
    UUID type for PostgreSQL.
    Stores UUIDs as VARCHAR(36) for compatibility with existing schema.
    Converts to/from Python uuid.UUID objects.
    """
    impl = CHAR(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(str(value))
        return value


class JSONType(TypeDecorator):
    """
    JSON type that uses PostgreSQL's native JSONB.
    Provides efficient querying and indexing of JSON data.
    """
    impl = PGJSONB
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, str):
            return json.loads(value)
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, str):
            return json.loads(value)
        return value

from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class UserRole(str, enum.Enum):
    """User role types for RBAC"""
    ADMIN = "admin"
    FACILITATOR = "facilitator"


class AccountStatus(str, enum.Enum):
    """Account status for registered users"""
    PENDING = "pending"       # Awaiting admin approval
    ACTIVE = "active"         # Can login and use the system
    DISABLED = "disabled"     # Account disabled by admin
    SUSPENDED = "suspended"   # Temporarily suspended


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    
    # RBAC fields
    role = Column(String(20), default=UserRole.FACILITATOR.value, nullable=False)
    status = Column(String(20), default=AccountStatus.PENDING.value, nullable=False)
    is_admin = Column(Boolean, default=False)  # Legacy field, kept for backwards compatibility
    
    # Organization (optional)
    organization = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Account management
    disabled_at = Column(DateTime, nullable=True)
    disabled_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    
    # MFA (optional)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    
    # Relationships
    workshops = relationship("Workshop", back_populates="facilitator", foreign_keys="[Workshop.facilitator_id]")
    
    __table_args__ = (
        Index('ix_users_role_status', 'role', 'status'),
    )
    
    @property
    def is_active_account(self) -> bool:
        """Check if account is active and can login"""
        return self.status == AccountStatus.ACTIVE.value
    
    @property
    def is_admin_user(self) -> bool:
        """Check if user has admin role"""
        return self.role == UserRole.ADMIN.value or self.is_admin

class WorkshopStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class WorkshopPhase(str, enum.Enum):
    INTAKE = "INTAKE"
    SCORING = "SCORING"
    ANALYSIS = "ANALYSIS"

class Workshop(Base):
    __tablename__ = "workshops"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    facilitator_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    title = Column(Text, nullable=False)
    pin = Column(String(6), unique=True, index=True, nullable=True)
    status = Column(String, default=WorkshopStatus.DRAFT) # Using String for Enum flexibility
    current_phase = Column(String, default=WorkshopPhase.INTAKE)
    config = Column(JSONType, default={}) # Stores criteria weights
    
    # Add active_use_case_id to track which item is being voted on
    active_use_case_id = Column(GUID(), ForeignKey("use_cases.id", use_alter=True, name="fk_workshop_active_use_case"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
 
    facilitator = relationship("User", back_populates="workshops")
    participants = relationship("Participant", back_populates="workshop")
    use_cases = relationship("UseCase", back_populates="workshop", foreign_keys="[UseCase.workshop_id]")
    active_use_case = relationship("UseCase", foreign_keys=[active_use_case_id], post_update=True)

class Vote(Base):
    __tablename__ = "votes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    use_case_id = Column(GUID(), ForeignKey("use_cases.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    
    # Stores scores as JSON: {"Feasibility": 80, "Value": 60}
    scores = Column(JSONType, default={})
    
    use_case = relationship("UseCase", back_populates="votes")
    participant = relationship("Participant", back_populates="votes")


class ParticipantRole(str, enum.Enum):
    PARTICIPANT = "PARTICIPANT"
    FACILITATOR = "FACILITATOR"
    PENDING_FACILITATOR = "PENDING_FACILITATOR"

class Participant(Base):
    __tablename__ = "participants"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    display_name = Column(String, nullable=False)
    role = Column(String, default=ParticipantRole.PARTICIPANT)
    # Simple logic: if they rejoin with same session storage, we trust them in MVP.
    # In prod, issue a signed JWT.
    
    workshop = relationship("Workshop", back_populates="participants")
    use_cases = relationship("UseCase", back_populates="participant")

class UseCase(Base):
    __tablename__ = "use_cases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=True)  # Nullable for facilitator-added use cases
    added_by_facilitator = Column(Boolean, default=False)  # Flag for facilitator submissions
    
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False) # Problem Statement (per US03)
    proposed_solution = Column(Text) # Explicit solution field
    kpi = Column(Text) # Success Metric
    target_user = Column(String) # Target User
    category = Column(String) # AI Technique
    
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    
    participant = relationship("Participant", back_populates="use_cases", foreign_keys=[participant_id])
    workshop = relationship("Workshop", back_populates="use_cases", foreign_keys=[workshop_id])

# Add relationship on Workshop as well


# Relationships defined after classes
UseCase.votes = relationship("Vote", back_populates="use_case")
Participant.votes = relationship("Vote", back_populates="participant")
