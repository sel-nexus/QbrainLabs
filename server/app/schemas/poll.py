from pydantic import BaseModel, field_validator
from typing import List, Optional, Any, Dict
from datetime import datetime
from uuid import UUID
from app.models.poll import PollType, PollStatus

# --- Poll Schemas ---

class PollBase(BaseModel):
    question_text: str
    poll_type: PollType
    options: List[str] = [] # For multiple choice/select
    is_anonymous: bool = False

class PollCreate(PollBase):
    pass

class PollSchema(PollBase):
    id: str
    workshop_id: str
    status: PollStatus
    created_at: datetime
    
    @field_validator('id', 'workshop_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True

class PollResponseSchema(BaseModel):
    id: str
    poll_id: str
    participant_id: Optional[str] = None
    response_data: Any # The actual answer (index, string, list, etc.)
    created_at: datetime
    
    @field_validator('id', 'poll_id', 'participant_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True

class PollStats(BaseModel):
    # Aggregated stats for the poll
    total_responses: int = 0
    results: Any = None # Dict with counts, etc.

class PollDetail(PollBase):
    id: str
    workshop_id: str
    status: PollStatus
    created_at: datetime
    stats: Optional[PollStats] = None
    user_response: Optional[Any] = None # For the current user if they voted
    
    @field_validator('id', 'workshop_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v
    
    class Config:
        from_attributes = True

# --- Reaction Schemas ---

class ReactionCreate(BaseModel):
    reaction_type: str

class ReactionMetrics(BaseModel):
    # Summary of reactions for a workshop/session
    counts: Dict[str, int] = {}
    recent_reactions: List[Dict[str, Any]] = [] # Stream of recent reactions for animation

# --- Question Schemas ---

class QuestionCreate(BaseModel):
    content: str
    is_anonymous: bool = False

class QuestionUpdate(BaseModel):
    is_answered: Optional[bool] = None
    is_pinned: Optional[bool] = None

class QuestionSchema(BaseModel):
    id: str
    workshop_id: str
    participant_id: Optional[str] = None
    display_name: Optional[str] = None # To display "Anonymous" or Name
    content: str
    is_answered: bool
    is_pinned: bool
    is_anonymous: bool
    created_at: datetime
    upvote_count: int = 0
    user_has_upvoted: bool = False # Current user context

    @field_validator('id', 'workshop_id', 'participant_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, UUID):
            return str(v)
        return v

    class Config:
        from_attributes = True
