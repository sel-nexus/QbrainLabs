"""
Roadmap Models for US20: AI Implementation Roadmap Generator
"""
from sqlalchemy import Column, String, ForeignKey, Integer, Date, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType, DateTime


class RoadmapStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    GENERATED = "GENERATED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ARCHIVED = "ARCHIVED"


class PhaseStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


class TaskStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    CANCELLED = "CANCELLED"


class DependencyType(str, enum.Enum):
    FINISH_TO_START = "FINISH_TO_START"
    START_TO_START = "START_TO_START"
    FINISH_TO_FINISH = "FINISH_TO_FINISH"
    START_TO_FINISH = "START_TO_FINISH"


class MilestoneStatus(str, enum.Enum):
    PENDING = "PENDING"
    ON_TRACK = "ON_TRACK"
    AT_RISK = "AT_RISK"
    DELAYED = "DELAYED"
    COMPLETED = "COMPLETED"


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    name = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default=RoadmapStatus.DRAFT.value)
    constraints = Column(JSONType, default={})  # Budget, team_size, working_days_per_week, etc.
    options = Column(JSONType, default={})  # include_contingency, risk_buffer_percent, etc.
    confidence = Column(JSONType, default={})  # level, variance_range
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    phases = relationship("RoadmapPhase", back_populates="roadmap", cascade="all, delete-orphan", order_by="RoadmapPhase.order_index")
    milestones = relationship("RoadmapMilestone", back_populates="roadmap", cascade="all, delete-orphan")
    scenarios = relationship("RoadmapScenario", back_populates="roadmap", cascade="all, delete-orphan")


class RoadmapPhase(Base):
    __tablename__ = "roadmap_phases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(GUID(), ForeignKey("roadmaps.id"), nullable=False)
    name = Column(String(100), nullable=False)
    order_index = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration_weeks = Column(Integer, nullable=True)
    status = Column(String(20), default=PhaseStatus.NOT_STARTED.value)
    description = Column(String(500), nullable=True)

    # Relationships
    roadmap = relationship("Roadmap", back_populates="phases")
    tasks = relationship("RoadmapTask", back_populates="phase", cascade="all, delete-orphan", order_by="RoadmapTask.start_date")


class RoadmapTask(Base):
    __tablename__ = "roadmap_tasks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    phase_id = Column(GUID(), ForeignKey("roadmap_phases.id"), nullable=False)
    use_case_id = Column(GUID(), ForeignKey("use_cases.id"), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration_days = Column(Integer, nullable=True)
    progress_percent = Column(Integer, default=0)
    status = Column(String(20), default=TaskStatus.NOT_STARTED.value)
    assigned_resources = Column(JSONType, default=[])  # List of role assignments

    # Relationships
    phase = relationship("RoadmapPhase", back_populates="tasks")
    use_case = relationship("UseCase", foreign_keys=[use_case_id])
    dependencies_from = relationship("TaskDependency", foreign_keys="TaskDependency.from_task_id", back_populates="from_task", cascade="all, delete-orphan")
    dependencies_to = relationship("TaskDependency", foreign_keys="TaskDependency.to_task_id", back_populates="to_task", cascade="all, delete-orphan")
    resource_allocations = relationship("ResourceAllocation", back_populates="task", cascade="all, delete-orphan")


class TaskDependency(Base):
    __tablename__ = "task_dependencies"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    from_task_id = Column(GUID(), ForeignKey("roadmap_tasks.id"), nullable=False)
    to_task_id = Column(GUID(), ForeignKey("roadmap_tasks.id"), nullable=False)
    dependency_type = Column(String(20), default=DependencyType.FINISH_TO_START.value)
    lag_days = Column(Integer, default=0)

    # Relationships
    from_task = relationship("RoadmapTask", foreign_keys=[from_task_id], back_populates="dependencies_from")
    to_task = relationship("RoadmapTask", foreign_keys=[to_task_id], back_populates="dependencies_to")


class RoadmapMilestone(Base):
    __tablename__ = "roadmap_milestones"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(GUID(), ForeignKey("roadmaps.id"), nullable=False)
    name = Column(String(200), nullable=False)
    target_date = Column(Date, nullable=True)
    actual_date = Column(Date, nullable=True)
    status = Column(String(20), default=MilestoneStatus.PENDING.value)
    deliverables = Column(JSONType, default=[])  # List of deliverables
    owner = Column(String(100), nullable=True)
    description = Column(String(500), nullable=True)

    # Relationships
    roadmap = relationship("Roadmap", back_populates="milestones")


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    task_id = Column(GUID(), ForeignKey("roadmap_tasks.id"), nullable=False)
    role = Column(String(100), nullable=False)
    fte = Column(String(10), nullable=False)  # e.g., "0.5", "1.0", "2.0"
    skills_required = Column(JSONType, default=[])  # List of required skills
    notes = Column(String(500), nullable=True)

    # Relationships
    task = relationship("RoadmapTask", back_populates="resource_allocations")


class RoadmapScenario(Base):
    __tablename__ = "roadmap_scenarios"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(GUID(), ForeignKey("roadmaps.id"), nullable=False)
    name = Column(String(200), nullable=False)
    adjustments = Column(JSONType, default={})  # resource_change, deadline_change, scope_change
    results = Column(JSONType, default={})  # Comparison data
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    roadmap = relationship("Roadmap", back_populates="scenarios")
