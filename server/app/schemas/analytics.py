from typing import List, Optional, Dict, Any, Union
from datetime import date, datetime
from uuid import UUID
from pydantic import BaseModel, HttpUrl

# --- Analytics Snapshot Schemas ---

class AnalyticsMetric(BaseModel):
    label: str
    value: Union[int, float, str]
    trend: float  # Percentage change (+/-)
    trend_direction: str  # "up", "down", "neutral"


class WorkshopPerformance(BaseModel):
    total_workshops: int
    active_workshops: int
    completed_workshops: int
    avg_engagement: float
    total_participants: int
    total_usecases: int = 0


class CategoryDistribution(BaseModel):
    category: str
    count: int
    percentage: float
    avg_score: float


class AnalyticsOverviewResponse(BaseModel):
    organization_id: Optional[UUID]
    period: str
    performance: WorkshopPerformance
    categories: List[CategoryDistribution]
    recent_trend: List[Dict[str, Any]]  # Date -> Value map


# --- Custom Dashboard Schemas ---

class WidgetConfig(BaseModel):
    id: str
    type: str  # chart, metric, table, heatmap
    title: str
    data_source: str
    config: Dict[str, Any]
    w: int  # Width units
    h: int  # Height units
    x: int  # X position
    y: int  # Y position


class CustomDashboardBase(BaseModel):
    name: str
    description: Optional[str] = None
    widgets: List[WidgetConfig] = []
    layout: Optional[Dict[str, Any]] = None
    filters: Optional[Dict[str, Any]] = None
    is_shared: bool = False


class CustomDashboardCreate(CustomDashboardBase):
    pass


class CustomDashboardUpdate(CustomDashboardBase):
    name: Optional[str] = None


class CustomDashboardResponse(CustomDashboardBase):
    id: UUID
    user_id: UUID
    organization_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Report Schemas ---

class ReportCreate(BaseModel):
    title: str
    report_type: str
    format: str = "pdf"
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    parameters: Optional[Dict[str, Any]] = None


class ReportResponse(BaseModel):
    id: UUID
    title: str
    report_type: str
    format: str
    period_start: Optional[date]
    period_end: Optional[date]
    file_url: str
    file_size_bytes: Optional[int]
    status: str = "completed"  # pending, processing, completed, failed
    created_at: datetime

    class Config:
        from_attributes = True


# --- Benchmark Schemas ---

class BenchmarkMetric(BaseModel):
    metric_name: str
    your_value: float
    industry_avg: float
    percentile: float
    industry_p10: float
    industry_p90: float


class BenchmarkResponse(BaseModel):
    industry: str
    period: str
    metrics: List[BenchmarkMetric]
