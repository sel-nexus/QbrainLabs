from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

class BadgeBase(BaseModel):
    name: str
    icon: str
    description: Optional[str] = None
    rarity: str
    criteria: Optional[Dict[str, Any]] = None

class BadgeResponse(BadgeBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True

class EarnedBadgeResponse(BaseModel):
    id: UUID
    badge: BadgeResponse
    earned_at: datetime
    workshop_id: UUID

    class Config:
        from_attributes = True

class PointsResponse(BaseModel):
    total_points: int
    session_points: int
    breakdown: List[Dict[str, Any]]

class LeaderboardEntry(BaseModel):
    rank: int
    participant_id: UUID
    display_name: str
    points: int
    badges_count: int
    team_name: Optional[str] = None

class LeaderboardResponse(BaseModel):
    rankings: List[LeaderboardEntry]

class PointActionRequest(BaseModel):
    participant_id: str
    workshop_id: str
    action: str
    metadata: Optional[Dict[str, Any]] = None

class PointEarnedResponse(BaseModel):
    new_total: int
    points_earned: int
    achievements_unlocked: List[str] = []
