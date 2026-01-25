"""
Pydantic schemas for US16: AI Copilot Assistant
"""
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


# ============================================================================
# Enums
# ============================================================================

class SuggestionTypeEnum(str, Enum):
    engagement = "engagement"
    content = "content"
    voting = "voting"
    facilitation = "facilitation"
    anomaly = "anomaly"
    discussion = "discussion"
    summary = "summary"


class SuggestionPriorityEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class CopilotModeEnum(str, Enum):
    proactive = "proactive"
    reactive = "reactive"
    silent = "silent"


class SummaryFormatEnum(str, Enum):
    executive = "executive"
    detailed = "detailed"
    email = "email"
    slides = "slides"


class AnomalyDataTypeEnum(str, Enum):
    votes = "votes"
    content = "content"
    behavior = "behavior"
    all = "all"


# ============================================================================
# Request Schemas
# ============================================================================

class SuggestionsRequest(BaseModel):
    """Request for generating copilot suggestions."""
    workshop_id: str
    context_type: Optional[str] = "proactive"  # proactive or reactive


class EnhanceContentRequest(BaseModel):
    """Request for enhancing use case content."""
    content: Dict[str, str]  # title, description, kpi
    context: Optional[Dict[str, str]] = None  # industry, workshop_goals


class VarianceAnalysisRequest(BaseModel):
    """Request for analyzing voting variance."""
    use_case_id: str
    workshop_id: str


class GenerateSummaryRequest(BaseModel):
    """Request for generating workshop summary."""
    workshop_id: str
    format: SummaryFormatEnum = SummaryFormatEnum.executive
    sections: Optional[List[str]] = None


class DetectAnomaliesRequest(BaseModel):
    """Request for detecting anomalies."""
    workshop_id: str
    data_type: AnomalyDataTypeEnum = AnomalyDataTypeEnum.all


class UpdateSettingsRequest(BaseModel):
    """Request for updating copilot settings."""
    workshop_id: str
    mode: Optional[CopilotModeEnum] = None
    engagement_alerts_enabled: Optional[bool] = None
    voting_anomaly_alerts_enabled: Optional[bool] = None
    content_suggestions_enabled: Optional[bool] = None
    discussion_prompts_enabled: Optional[bool] = None
    inactivity_threshold_minutes: Optional[int] = None
    variance_alert_threshold: Optional[float] = None
    rapid_voting_threshold_seconds: Optional[int] = None


class DismissSuggestionRequest(BaseModel):
    """Request for dismissing a suggestion."""
    suggestion_id: str
    action: str = "dismiss"  # dismiss, acted_upon


# ============================================================================
# Response Schemas
# ============================================================================

class SuggestionAction(BaseModel):
    """Action that can be taken on a suggestion."""
    label: str
    action: str


class Suggestion(BaseModel):
    """A single copilot suggestion."""
    id: Optional[str] = None
    type: str
    message: str
    priority: str
    actions: List[SuggestionAction]
    context: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class SuggestionsResponse(BaseModel):
    """Response containing copilot suggestions."""
    suggestions: List[Suggestion]
    mode: str = "proactive"
    workshop_phase: Optional[str] = None


class ParticipantAlert(BaseModel):
    """Alert for a participant."""
    type: str
    message: str


class ParticipantEngagementMetrics(BaseModel):
    """Engagement metrics for a single participant."""
    id: str
    name: str
    engagement_score: float
    vote_count: int = 0
    submission_count: int = 0
    last_activity: Optional[str] = None
    alerts: List[ParticipantAlert] = []


class GroupEngagementMetrics(BaseModel):
    """Group-level engagement metrics."""
    avg_engagement: float
    at_risk_count: int
    total_participants: int


class EngagementResponse(BaseModel):
    """Response containing engagement data."""
    participants: List[ParticipantEngagementMetrics]
    group_metrics: GroupEngagementMetrics


class CriterionVariance(BaseModel):
    """Variance data for a scoring criterion."""
    mean: float
    std_dev: float


class VarianceDistribution(BaseModel):
    """Distribution buckets for votes."""
    low: int = 0      # 1-3
    mid: int = 0      # 4-6
    high: int = 0     # 7-10


class VarianceAnalysisResponse(BaseModel):
    """Response containing variance analysis."""
    use_case_id: str
    vote_count: int
    mean: Optional[float] = None
    std_dev: float
    is_significant: bool
    is_bimodal: Optional[bool] = False
    distribution: Dict[str, int] = {}
    by_criterion: Optional[Dict[str, CriterionVariance]] = None
    recommendation: Optional[Dict[str, Any]] = None


class DiscussionPrompt(BaseModel):
    """A discussion prompt for a use case."""
    category: str
    question: str
    follow_up: Optional[str] = None


class DiscussionPromptsResponse(BaseModel):
    """Response containing discussion prompts."""
    prompts: List[DiscussionPrompt]
    use_case_id: str
    use_case_title: Optional[str] = None


class TopRecommendation(BaseModel):
    """A top recommendation in the summary."""
    title: str
    score: Optional[float] = None
    rationale: Optional[str] = None


class ParticipantStats(BaseModel):
    """Participant statistics for summary."""
    total: int
    avg_engagement: float
    at_risk: int


class SummaryContent(BaseModel):
    """Generated summary content."""
    format: str
    generated_at: str
    is_mock: bool = False
    executive_summary: str
    key_findings: List[str]
    top_recommendations: List[TopRecommendation]
    next_steps: List[str]
    participant_stats: ParticipantStats


class GenerateSummaryResponse(BaseModel):
    """Response containing generated summary."""
    summary: SummaryContent
    download_url: Optional[str] = None


class Anomaly(BaseModel):
    """A detected anomaly."""
    type: str
    severity: str
    details: Dict[str, Any]
    recommendation: Optional[str] = None


class DetectAnomaliesResponse(BaseModel):
    """Response containing detected anomalies."""
    anomalies: List[Anomaly]
    data_type: str
    workshop_id: str


class QualityScore(BaseModel):
    """Quality scores for content."""
    completeness: float
    clarity: float
    technical_depth: float
    overall: float


class EnhanceContentResponse(BaseModel):
    """Response for content enhancement."""
    enhanced: Dict[str, Any]
    quality_score: QualityScore
    improvements_made: List[str]


class CopilotSettingsResponse(BaseModel):
    """Response containing copilot settings."""
    workshop_id: str
    mode: str
    engagement_alerts_enabled: bool
    voting_anomaly_alerts_enabled: bool
    content_suggestions_enabled: bool
    discussion_prompts_enabled: bool
    inactivity_threshold_minutes: int
    variance_alert_threshold: float
    rapid_voting_threshold_seconds: int
