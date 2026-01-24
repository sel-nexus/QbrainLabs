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
