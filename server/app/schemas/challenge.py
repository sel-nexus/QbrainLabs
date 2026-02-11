"""
Challenge Cards Schemas (US34)
Pydantic schemas for challenge card API requests and responses
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class ChallengeCardCreate(BaseModel):
    """Schema for creating a challenge card"""
    title: str = Field(..., max_length=100)
    challenge_description: str = Field(..., max_length=2000)
    success_criteria: List[str] = Field(..., min_length=1, max_length=10)
    display_order: int = Field(default=0, ge=0)
    
    @field_validator('success_criteria')
    @classmethod
    def validate_success_criteria(cls, v):
        if not v:
            raise ValueError('At least one success criterion is required')
        if len(v) > 10:
            raise ValueError('Maximum 10 success criteria allowed')
        for criterion in v:
            if len(criterion) > 500:
                raise ValueError('Each success criterion must be 500 characters or less')
        return v


class ChallengeCardUpdate(BaseModel):
    """Schema for updating a challenge card"""
    title: Optional[str] = Field(None, max_length=100)
    challenge_description: Optional[str] = Field(None, max_length=2000)
    success_criteria: Optional[List[str]] = Field(None, min_length=1, max_length=10)
    display_order: Optional[int] = Field(None, ge=0)
    
    @field_validator('success_criteria')
    @classmethod
    def validate_success_criteria(cls, v):
        if v is not None:
            if len(v) > 10:
                raise ValueError('Maximum 10 success criteria allowed')
            for criterion in v:
                if len(criterion) > 500:
                    raise ValueError('Each success criterion must be 500 characters or less')
        return v


class ChallengeCardResponse(BaseModel):
    """Schema for challenge card response"""
    id: UUID
    workshop_id: UUID
    title: str
    challenge_description: str
    success_criteria: List[str]
    display_order: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChallengeCardReorder(BaseModel):
    """Schema for reordering challenge cards"""
    display_order: int = Field(..., ge=0)


class StepGenerationRequest(BaseModel):
    """Schema for step generation requests"""
    include_workshop_context: bool = Field(default=False)
    include_previous_steps: bool = Field(default=False)
    format: Optional[str] = Field(default="markdown", pattern="^(markdown|text|pdf)$")
    step_content: Optional[str] = Field(None, description="Content generated in the step to be summarized")


class StepGenerationResponse(BaseModel):
    """Schema for step generation responses"""
    step_number: int
    step_name: str
    content: str
    generated_at: datetime
    format: str


class GenerateAllStepsRequest(BaseModel):
    """Schema for generating all steps at once"""
    type: str = Field(default="prompt", pattern="^(prompt|summary)$")
    include_workshop_context: bool = Field(default=False)
    steps: Optional[List[int]] = Field(default=None)
    format: Optional[str] = Field(default="markdown", pattern="^(markdown|text|pdf)$")


class GenerateAllStepsResponse(BaseModel):
    """Schema for generate all steps response"""
    challenge_id: UUID
    generated_steps: List[StepGenerationResponse]
    generated_at: datetime
