from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional, List


# Length limits shared with the client form (client/src/components/UseCaseForm.tsx).
TITLE_MAX = 200
TEXT_MAX = 2000
SHORT_MAX = 300


class UseCaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=TITLE_MAX)
    description: str = Field(..., max_length=TEXT_MAX)  # Problem Statement
    proposed_solution: str = Field("", max_length=TEXT_MAX)  # optional
    kpi: str = Field(..., max_length=SHORT_MAX)
    target_user: str = Field(..., max_length=SHORT_MAX)
    category: Optional[str] = None
    participant_id: Optional[UUID] = None  # Optional for facilitator-added use cases
    workshop_id: UUID
    added_by_facilitator: Optional[bool] = False  # Flag to indicate facilitator submission


class UseCaseFacilitatorCreate(BaseModel):
    """Schema for facilitator adding a use case to one or more workshops."""
    title: str = Field(..., min_length=1, max_length=TITLE_MAX)
    description: str = Field(..., max_length=TEXT_MAX)  # Problem Statement
    proposed_solution: str = Field("", max_length=TEXT_MAX)
    kpi: str = Field(..., max_length=SHORT_MAX)
    target_user: str = Field(..., max_length=SHORT_MAX)
    category: Optional[str] = None
    workshop_ids: List[UUID]  # One or more workshops to attach this use case to


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
    title: str = Field(..., min_length=1, max_length=TITLE_MAX)  # Required
    description: str = Field(..., max_length=TEXT_MAX)  # Required
    proposed_solution: Optional[str] = Field("", max_length=TEXT_MAX)
    kpi: Optional[str] = Field("", max_length=SHORT_MAX)
    target_user: Optional[str] = Field("", max_length=SHORT_MAX)
    category: Optional[str] = ""
