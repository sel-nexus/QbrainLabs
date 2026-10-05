from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class PhaseUpdate(BaseModel):
    phase: str

class ActivateCard(BaseModel):
    use_case_id: Optional[UUID] = None

class WorkshopLLMModelsUpdate(BaseModel):
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None

class WorkshopLLMModelsResponse(BaseModel):
    embedding_model_id: Optional[UUID] = None
    decision_model_id: Optional[UUID] = None
    reasoning_model_id: Optional[UUID] = None
