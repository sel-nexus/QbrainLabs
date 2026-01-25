from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from uuid import UUID
from datetime import datetime

class CostInputs(BaseModel):
    implementation: float = Field(..., description="One-time implementation cost")
    infrastructure: float = Field(0.0, description="Monthly infrastructure cost")
    licensing: float = Field(0.0, description="Annual licensing cost")
    training: float = Field(0.0, description="One-time training cost")
    maintenance_rate: float = Field(0.15, description="Maintenance cost as percentage of implementation (0-1)")

class BenefitInputs(BaseModel):
    time_savings_hours: float = Field(0.0, description="Hours saved per week")
    hourly_rate: float = Field(0.0, description="Hourly labor rate")
    error_reduction_pct: float = Field(0.0, description="Error reduction percentage")
    revenue_impact: float = Field(0.0, description="Annual revenue impact")
    cost_avoidance: float = Field(0.0, description="One-time cost avoidance")
    productivity_gain_pct: float = Field(0.0, description="Productivity gain percentage")

class ROIParameters(BaseModel):
    discount_rate: float = Field(0.10, description="Discount rate for NPV (0-1)")
    project_years: int = Field(3, description="Number of years for projection")
    inflation_rate: float = Field(0.03, description="Annual inflation rate (0-1)")

class AnnualData(BaseModel):
    year: int
    costs: float
    benefits: float
    net: float
    cumulative: float

class ROIChartData(BaseModel):
    timeline: List[AnnualData]
    cost_breakdown: Dict[str, float]
    benefit_breakdown: Dict[str, float]

class ROIResults(BaseModel):
    roi_percent: float
    npv: float
    irr: float
    payback_months: float
    tco: float
    annual_breakdown: List[AnnualData]
    charts_data: ROIChartData

class ROICalculationCreate(BaseModel):
    use_case_id: UUID
    costs: CostInputs
    benefits: BenefitInputs
    parameters: Optional[ROIParameters] = Field(default_factory=ROIParameters)

class ROICalculationResponse(BaseModel):
    id: UUID
    use_case_id: UUID
    workshop_id: UUID
    costs: CostInputs
    benefits: BenefitInputs
    parameters: ROIParameters
    results: ROIResults
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IndustryBenchmarkBase(BaseModel):
    use_case_type: str
    industry: str
    company_size: Optional[str]
    metric_name: str
    metric_value: Dict
    source: Optional[str]
    year: Optional[int]

class IndustryBenchmarkResponse(IndustryBenchmarkBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class BusinessCaseCreate(BaseModel):
    use_case_id: UUID
    roi_calculation_id: UUID
    template: str = "formal"
    sections: List[str]
    branding: Dict

class BusinessCaseResponse(BaseModel):
    id: UUID
    use_case_id: UUID
    status: str
    document_urls: Dict[str, str]
    created_at: datetime

    class Config:
        from_attributes = True

class ROIEstimateRequest(BaseModel):
    use_case_id: UUID
    use_case_type: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = "Mid-Market"

class ConfidenceInterval(BaseModel):
    low: float
    mid: float
    high: float
    confidence: float

class ROIEstimatesResponse(BaseModel):
    estimates: Dict[str, ConfidenceInterval]
    benchmarks: List[Dict[str, Any]] = []
    similar_cases: List[Dict[str, Any]] = []
    is_mock: bool = False
