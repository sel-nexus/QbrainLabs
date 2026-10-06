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
    # US48.11: one consistent view of the results everywhere
    rank: Optional[int] = None          # competition rank (ties share a rank); None if unscored
    tied: bool = False
    normalized_score: float = 0.0       # weighted score on 0-100
    scale_max: float = 100.0            # scale the per-criterion `scores` are on (10 or 100)
    agreement: Optional[float] = None   # 0-100, None if fewer than two scores per criterion
    consensus_level: Optional[str] = None  # high | moderate | needs_discussion
    quadrant: Optional[str] = None      # quick_wins | strategic_bets | nice_to_have | dont_do
