from pydantic import BaseModel
from uuid import UUID
from typing import Dict, Optional

class AggregatedResult(BaseModel):
    id: UUID
    title: str
    description: str
    category: Optional[str] = None
    scores: Dict[str, float] # {"Feasibility": 75.5, "Business Value": 80.0}
    total_score: float
    vote_count: int
    variance: float = 0.0
    x: Optional[float] = None
    y: Optional[float] = None
