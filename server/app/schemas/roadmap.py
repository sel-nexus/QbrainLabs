"""
Roadmap Schemas for US20: AI Implementation Roadmap Generator
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import date, datetime


# Request Schemas
class RoadmapConstraints(BaseModel):
    start_date: Optional[date] = None
    deadline: Optional[date] = None
    budget: Optional[float] = None
    team_size: int = Field(default=5, ge=1)
    working_days_per_week: int = Field(default=5, ge=1, le=7)


class RoadmapOptions(BaseModel):
    include_contingency: bool = Field(default=True)
    risk_buffer_percent: float = Field(default=20.0, ge=0, le=100)
    parallel_execution: bool = Field(default=True)


class RoadmapGenerateRequest(BaseModel):
    workshop_id: UUID
    use_case_ids: List[UUID]
    constraints: RoadmapConstraints
    options: Optional[RoadmapOptions] = None


class RoadmapUpdateRequest(BaseModel):
    name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    constraints: Optional[Dict[str, Any]] = None


# Response Schemas
class ResourceAllocationResponse(BaseModel):
    id: UUID
    role: str
    fte: str
    skills_required: List[str]
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class TaskDependencyResponse(BaseModel):
    id: UUID
    from_task_id: UUID
    to_task_id: UUID
    dependency_type: str
    lag_days: int

    class Config:
        from_attributes = True


class RoadmapTaskResponse(BaseModel):
    id: UUID
    phase_id: UUID
    use_case_id: Optional[UUID] = None
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress_percent: int
    status: str
    assigned_resources: List[Dict[str, Any]]
    resource_allocations: List[ResourceAllocationResponse] = []

    class Config:
        from_attributes = True


class RoadmapPhaseResponse(BaseModel):
    id: UUID
    roadmap_id: UUID
    name: str
    order_index: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_weeks: Optional[int] = None
    status: str
    description: Optional[str] = None
    tasks: List[RoadmapTaskResponse] = []

    class Config:
        from_attributes = True


class RoadmapMilestoneResponse(BaseModel):
    id: UUID
    roadmap_id: UUID
    name: str
    target_date: Optional[date] = None
    actual_date: Optional[date] = None
    status: str
    deliverables: List[str]
    owner: Optional[str] = None
    description: Optional[str] = None

    class Config:
        from_attributes = True


class TimelineResponse(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    total_weeks: Optional[int] = None
    phases: List[RoadmapPhaseResponse] = []


class ResourcesResponse(BaseModel):
    total_fte: float
    roles: List[Dict[str, Any]]
    by_phase: List[Dict[str, Any]] = []
    by_role: List[Dict[str, Any]] = []
    skill_gaps: List[Dict[str, Any]] = []


class ConfidenceResponse(BaseModel):
    level: str  # HIGH, MEDIUM, LOW
    variance_range: Dict[str, float]  # e.g., {"min": -10, "max": 10}


class RoadmapResponse(BaseModel):
    id: UUID
    workshop_id: UUID
    name: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: str
    constraints: Dict[str, Any]
    options: Dict[str, Any]
    confidence: Dict[str, Any]
    timeline: TimelineResponse
    resources: ResourcesResponse
    milestones: List[RoadmapMilestoneResponse]
    dependencies: List[TaskDependencyResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoadmapGenerateResponse(BaseModel):
    roadmap_id: UUID
    timeline: TimelineResponse
    resources: ResourcesResponse
    milestones: List[RoadmapMilestoneResponse]
    dependencies: List[TaskDependencyResponse]
    confidence: ConfidenceResponse


# Resource Planning Schemas
class ResourceSummaryResponse(BaseModel):
    total_fte: float
    cost_estimate: Optional[float] = None


class ResourceOptimizeRequest(BaseModel):
    max_fte: Optional[float] = None
    budget: Optional[float] = None


class ResourceOptimizeResponse(BaseModel):
    optimized_allocation: Dict[str, Any]
    trade_offs: List[str]


# Critical Path Schemas
class CriticalPathResponse(BaseModel):
    critical_path_tasks: List[UUID]
    slack_times: Dict[str, float]  # task_id -> slack_days
    earliest_completion: date


# Estimation Schemas
class EstimationFactors(BaseModel):
    complexity: float = Field(ge=1, le=10)
    data_availability: float = Field(ge=1, le=10)
    team_experience: float = Field(ge=1, le=10)
    technology_maturity: float = Field(ge=1, le=10)
    organizational_readiness: float = Field(ge=1, le=10)
    integration_points: int = Field(ge=0)


class EstimationRequest(BaseModel):
    use_case_id: UUID
    factors: EstimationFactors


class EstimationResponse(BaseModel):
    estimate: Dict[str, float]  # optimistic, most_likely, pessimistic
    confidence: Dict[str, Any]
    similar_projects: List[Dict[str, Any]]


# Export Schemas
class ExportRequest(BaseModel):
    format: str = Field(..., pattern="^(pdf|xlsx|pptx|json|png|svg)$")


class ExportResponse(BaseModel):
    download_url: str


# Scenario Schemas
class ScenarioAdjustments(BaseModel):
    resource_change: Optional[float] = None  # Percentage change
    deadline_change: Optional[int] = None  # Days change
    scope_change: Optional[List[UUID]] = None  # Use case IDs to add/remove


class ScenarioCreateRequest(BaseModel):
    name: str
    adjustments: ScenarioAdjustments


class ScenarioResponse(BaseModel):
    scenario_id: UUID
    comparison: Dict[str, Any]
