from pydantic import BaseModel
from typing import Optional, Dict, Any

class EnhanceRequest(BaseModel):
    text: str

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

class BusinessValueResponse(BaseModel):
    enhanced_kpi: str
    specific_metrics: list[str]
    roi_indicators: list[str]
    benchmarks: list[Dict[str, str]]
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

class TechnicalAnalysisResponse(BaseModel):
    architecture_overview: str
    recommended_stack: list[TechStackComponent]
    implementation_steps: list[str]
    technical_risks: list[str]
    complexity_score: int  # 1-10
    is_mock: bool = False
