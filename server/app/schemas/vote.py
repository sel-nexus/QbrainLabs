from pydantic import BaseModel
from typing import Dict
from uuid import UUID

class VoteSubmit(BaseModel):
    use_case_id: UUID
    participant_id: UUID
    scores: Dict[str, int] # {"Feasibility": 55, "Value": 80}

class VoteResponse(BaseModel):
    id: UUID
    use_case_id: UUID
    participant_id: UUID
    
    class Config:
        from_attributes = True
