from pydantic import BaseModel, Field, validator
from typing import List, Optional
from uuid import UUID

class Criterion(BaseModel):
    name: str
    weight: int = Field(..., ge=0, le=100)
    description: Optional[str] = None

class WorkshopConfig(BaseModel):
    criteria: List[Criterion]
    template_id: Optional[str] = None
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None

    @validator('criteria')
    def validate_weights(cls, v):
        total = sum(c.weight for c in v)
        if total != 100:
            raise ValueError(f'Total criteria weight must be 100%. Current: {total}%')
        return v

class WorkshopCreate(BaseModel):
    title: str
    config: WorkshopConfig

class PendingFacilitator(BaseModel):
    id: UUID = Field(..., alias="participant_id")
    display_name: str

class WorkshopResponse(BaseModel):
    id: UUID
    title: str
    pin: Optional[str]
    status: str
    current_phase: Optional[str] = "INTAKE"
    active_use_case_id: Optional[UUID] = None
    config: WorkshopConfig
    pending_facilitators: List[PendingFacilitator] = []

    class Config:
        from_attributes = True
