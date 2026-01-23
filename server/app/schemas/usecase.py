from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class UseCaseCreate(BaseModel):
    title: str
    description: str # Problem Statement
    proposed_solution: str
    kpi: str
    target_user: str
    category: Optional[str] = None
    participant_id: UUID
    workshop_id: UUID

class UseCaseResponse(BaseModel):
    id: UUID
    title: str
    description: str
    status: str
    author_name: Optional[str] = None
    
    class Config:
        from_attributes = True
