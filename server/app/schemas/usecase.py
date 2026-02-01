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
    participant_id: Optional[UUID] = None  # Optional for facilitator-added use cases
    workshop_id: UUID
    added_by_facilitator: Optional[bool] = False  # Flag to indicate facilitator submission

class UseCaseResponse(BaseModel):
    id: UUID
    title: str
    description: str
    status: str
    author_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class UseCaseUpdate(BaseModel):
    """Schema for updating a use case"""
    title: str  # Required
    description: str  # Required
    proposed_solution: Optional[str] = ""
    kpi: Optional[str] = ""
    target_user: Optional[str] = ""
    category: Optional[str] = ""
