from pydantic import BaseModel
from uuid import UUID
from typing import Dict, Optional

class PhaseUpdate(BaseModel):
    phase: str

class WorkshopCompletion(BaseModel):
    completed: bool = True

class WorkshopProgress(BaseModel):
    participants: int
    use_cases: int
    submitters: int
    scorers: int
    votes_by_use_case: Dict[str, int] = {}
    active_use_case_id: Optional[str] = None
    active_card_votes: int = 0

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
