from pydantic import BaseModel, Field
from typing import Optional

class WorkshopUpdate(BaseModel):
    """Schema for updating workshop settings"""
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    # US48.12: the participant leaderboard is opt-in
    show_leaderboard: Optional[bool] = None
