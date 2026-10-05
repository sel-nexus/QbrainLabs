from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class EnhanceRequest(BaseModel):
    text: str
    workshop_id: Optional[str] = None

class EnhanceResponse(BaseModel):
    refined_title: Optional[str] = None
    title: Optional[str] = None # Fallback
    refined_description: Optional[str] = None
    description: Optional[str] = None # Fallback
    suggested_solution: Optional[str] = None
    solution: Optional[str] = None # Fallback
    kpi: Optional[str] = None
    is_mock: bool = False

class FeasibilityRequest(BaseModel):
    solution: str
    workshop_id: Optional[str] = None

class FeasibilityResponse(BaseModel):
    score: str
    reason: str
    is_mock: bool = False

class DuplicateCheckRequest(BaseModel):
    workshop_id: str
    title: str
    description: str

class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    similarity_score: float
    similar_to_id: Optional[str] = None
    similar_to_title: Optional[str] = None
    message: Optional[str] = None

class BusinessValueRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = "Generative AI"
    current_kpi: Optional[str] = None
    workshop_id: Optional[str] = None

class BusinessValueResponse(BaseModel):
    enhanced_kpi: str
    specific_metrics: List[str]
    roi_indicators: List[str]
    benchmarks: List[Dict[str, str]]
    business_impact: str
    confidence_score: float
    is_mock: bool = False

class TechStackComponent(BaseModel):
    category: str  # e.g. "Frontend", "Backend", "AI Model"
    name: str     # e.g. "React", "FastAPI", "GPT-4"
    justification: str

class TechnicalAnalysisRequest(BaseModel):
    title: str
    description: str
    proposed_solution: str
    workshop_id: Optional[str] = None

class TechnicalAnalysisResponse(BaseModel):
    architecture_overview: str
    recommended_stack: List[TechStackComponent]
    implementation_steps: List[str]
    technical_risks: List[str]
    complexity_score: int  # 1-10
    is_mock: bool = False

class ROIRequest(BaseModel):
    title: str
    description: str
    industry: Optional[str] = "General"

class ROIResponse(BaseModel):
    estimates: Dict[str, Any]
    cost_drivers: List[str]
    benefit_levers: List[str]
    assumptions: List[str]
    is_mock: bool = False

class BusinessCaseRequest(BaseModel):
    title: str
    description: str
    proposed_solution: str
    roi_results: Dict[str, Any]

class BusinessCaseResponse(BaseModel):
    executive_summary: str
    problem_statement: str
    strategic_alignment: str
    financial_analysis: str
    risks_and_mitigation: str
    recommendation: str
    is_mock: bool = False
