from pydantic import BaseModel
from uuid import UUID
from typing import Dict

class AggregatedResult(BaseModel):
    id: UUID
    title: str
    description: str
    category: str | None = None
    scores: Dict[str, float] # {"Feasibility": 75.5, "Business Value": 80.0}
    total_score: float
    vote_count: int
