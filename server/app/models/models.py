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
    JSON type that uses PostgreSQL's native JSONB in production
    and TEXT in SQLite for testing.
    Provides efficient querying and indexing of JSON data in PostgreSQL.
    """
    impl = SAString
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PGJSONB())
        else:
            # Use TEXT for SQLite and other databases
            return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name != 'postgresql':
            # For SQLite, serialize to JSON string
            return json.dumps(value)
        # For PostgreSQL, let JSONB handle it
        # JSONB can handle Python native types (dict, list, str, int, float, bool, None)
        # directly without conversion
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if dialect.name != 'postgresql':
            # For SQLite, deserialize from JSON string
            if isinstance(value, str):
                return json.loads(value)
            return value
        # For PostgreSQL, JSONB returns dict/list directly
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
    DELETED = "DELETED"

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
    challenge_cards = relationship("ChallengeCard", back_populates="workshop", cascade="all, delete-orphan")

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
    joined_at = Column(DateTime, nullable=True, default=datetime.utcnow)
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
    facilitator_group_id = Column(GUID(), nullable=True)  # Groups facilitator-added use cases created across multiple workshops
    
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=False) # Problem Statement (per US03)
    proposed_solution = Column(Text) # Explicit solution field
    kpi = Column(Text) # Success Metric
    target_user = Column(String) # Target User
    category = Column(String) # AI Technique
    
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    participant = relationship("Participant", back_populates="use_cases", foreign_keys=[participant_id])
    workshop = relationship("Workshop", back_populates="use_cases", foreign_keys=[workshop_id])
    roi_calculation = relationship("ROICalculation", back_populates="use_case", uselist=False)

# Add relationship on Workshop as well


# Relationships defined after classes
UseCase.votes = relationship("Vote", back_populates="use_case")
Participant.votes = relationship("Vote", back_populates="participant")


class UseCaseFeedback(Base):
    __tablename__ = "usecase_feedback"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    usecase_id = Column(GUID(), ForeignKey("use_cases.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False)
    feedback_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    usecase = relationship("UseCase", backref="feedback")
    participant = relationship("Participant", backref="usecase_feedback")


# ============================================================================
# US16: AI Copilot Assistant Models
# ============================================================================

class SuggestionType(str, enum.Enum):
    """Types of copilot suggestions"""
    ENGAGEMENT = "engagement"           # Participation/engagement related
    CONTENT = "content"                  # Use case quality/content
    VOTING = "voting"                    # Voting pattern alerts
    FACILITATION = "facilitation"        # Facilitation tips
    ANOMALY = "anomaly"                  # Anomaly detection
    DISCUSSION = "discussion"            # Discussion prompts
    SUMMARY = "summary"                  # Summary/insights


class SuggestionPriority(str, enum.Enum):
    """Priority levels for suggestions"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class SuggestionStatus(str, enum.Enum):
    """Status of a suggestion"""
    PENDING = "pending"         # Shown but not acted upon
    DISMISSED = "dismissed"     # User dismissed
    ACTED_UPON = "acted_upon"   # User took action


class CopilotSuggestion(Base):
    """
    Stores AI-generated suggestions for facilitators during workshops.
    Tracks whether suggestions were acted upon for learning.
    """
    __tablename__ = "copilot_suggestions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    
    # Suggestion details
    suggestion_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(String(20), default=SuggestionPriority.MEDIUM.value)
    
    # Context that triggered the suggestion
    context = Column(JSONType, default={})
    
    # Suggested actions (list of action objects)
    actions = Column(JSONType, default=[])
    
    # Status tracking
    status = Column(String(20), default=SuggestionStatus.PENDING.value)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    
    # Relationships
    workshop = relationship("Workshop", backref="copilot_suggestions")
    
    __table_args__ = (
        Index('ix_copilot_suggestions_workshop', 'workshop_id'),
        Index('ix_copilot_suggestions_type_status', 'suggestion_type', 'status'),
    )


class ParticipantEngagement(Base):
    """
    Tracks participant engagement metrics during workshops.
    Used by AI Copilot to identify disengaged participants.
    """
    __tablename__ = "participant_engagement"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    
    # Engagement metrics
    engagement_score = Column(String(10), default="0.0")  # 0-100 score
    
    # Activity tracking
    last_activity = Column(DateTime, default=datetime.utcnow)
    total_votes = Column(String(10), default="0")
    total_submissions = Column(String(10), default="0")
    avg_vote_time_seconds = Column(String(10), default="0")  # Average time per vote
    
    # Detailed activity log (list of activity events)
    activity_log = Column(JSONType, default=[])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    participant = relationship("Participant", backref="engagement_records")
    workshop = relationship("Workshop", backref="engagement_records")
    
    __table_args__ = (
        Index('ix_participant_engagement_workshop', 'workshop_id'),
        Index('ix_participant_engagement_participant', 'participant_id'),
    )


class SummaryFormat(str, enum.Enum):
    """Supported summary formats"""
    EXECUTIVE = "executive"       # 1-page executive summary
    DETAILED = "detailed"         # Full detailed report
    EMAIL = "email"               # Email-ready format
    SLIDES = "slides"             # PowerPoint-ready content


class WorkshopSummary(Base):
    """
    Stores AI-generated workshop summaries in various formats.
    """
    __tablename__ = "workshop_summaries"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    
    # Summary details
    format = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    
    # Metadata (key findings, stats, etc.)
    summary_metadata = Column(JSONType, default={})
    
    # Sections included in the summary
    sections = Column(JSONType, default=[])
    
    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workshop = relationship("Workshop", backref="summaries")
    
    __table_args__ = (
        Index('ix_workshop_summaries_workshop', 'workshop_id'),
    )


class AnomalyType(str, enum.Enum):
    """Types of detected anomalies"""
    VOTING_RAPID = "voting_rapid"               # Very fast voting
    VOTING_UNIFORM = "voting_uniform"           # Same scores for all
    VOTING_EXTREME = "voting_extreme"           # All high or all low
    VOTING_HIGH_VARIANCE = "voting_high_variance"  # High disagreement
    CONTENT_DUPLICATE = "content_duplicate"     # Duplicate submissions
    CONTENT_OFFTOPIC = "content_offtopic"       # Off-topic content
    BEHAVIOR_INACTIVE = "behavior_inactive"     # Inactive participant
    GROUP_GROUPTHINK = "group_groupthink"       # Very low variance (groupthink)
    GROUP_POLARIZATION = "group_polarization"   # Bimodal voting distribution


class AnomalySeverity(str, enum.Enum):
    """Severity levels for anomalies"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class DetectedAnomaly(Base):
    """
    Records detected anomalies in workshop data.
    Used to alert facilitators about unusual patterns.
    """
    __tablename__ = "detected_anomalies"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    
    # Anomaly details
    anomaly_type = Column(String(50), nullable=False)
    severity = Column(String(20), default=AnomalySeverity.WARNING.value)
    
    # Details about the anomaly
    details = Column(JSONType, default={})
    
    # AI recommendation for addressing it
    recommendation = Column(Text, nullable=True)
    
    # Status tracking
    status = Column(String(20), default="active")  # active, resolved, dismissed
    
    # Related entities (participant_id, use_case_id, etc.)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(GUID(), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    
    # Relationships
    workshop = relationship("Workshop", backref="detected_anomalies")
    
    __table_args__ = (
        Index('ix_detected_anomalies_workshop', 'workshop_id'),
        Index('ix_detected_anomalies_type_severity', 'anomaly_type', 'severity'),
    )


class CopilotMode(str, enum.Enum):
    """Copilot interaction modes"""
    PROACTIVE = "proactive"   # AI surfaces suggestions automatically
    REACTIVE = "reactive"     # AI responds only when asked
    SILENT = "silent"         # AI monitors but doesn't interrupt


class CopilotSettings(Base):
    """
    Stores facilitator preferences for the AI Copilot.
    """
    __tablename__ = "copilot_settings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False, unique=True)
    
    # Mode settings
    mode = Column(String(20), default=CopilotMode.PROACTIVE.value)
    
    # Feature toggles
    engagement_alerts_enabled = Column(Boolean, default=True)
    voting_anomaly_alerts_enabled = Column(Boolean, default=True)
    content_suggestions_enabled = Column(Boolean, default=True)
    discussion_prompts_enabled = Column(Boolean, default=True)
    
    # Thresholds
    inactivity_threshold_minutes = Column(String(5), default="8")
    variance_alert_threshold = Column(String(5), default="2.5")  # Standard deviation
    rapid_voting_threshold_seconds = Column(String(5), default="5")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workshop = relationship("Workshop", backref="copilot_settings", uselist=False)
    
    __table_args__ = (
        Index('ix_copilot_settings_workshop', 'workshop_id'),
    )
