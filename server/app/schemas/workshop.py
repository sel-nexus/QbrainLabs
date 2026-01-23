from pydantic import BaseModel, Field, validator
from typing import List, Optional
from uuid import UUID

class Criterion(BaseModel):
    name: str
    weight: int = Field(..., ge=0, le=100)
    description: Optional[str] = None

class WorkshopConfig(BaseModel):
    criteria: List[Criterion]

    @validator('criteria')
    def validate_weights(cls, v):
        total = sum(c.weight for c in v)
        if total != 100:
            raise ValueError(f'Total criteria weight must be 100%. Current: {total}%')
        return v

class WorkshopCreate(BaseModel):
    title: str
    config: WorkshopConfig

class WorkshopResponse(BaseModel):
    id: UUID
    title: str
    pin: Optional[str]
    status: str
    config: WorkshopConfig

    class Config:
        from_attributes = True
