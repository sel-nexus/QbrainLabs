from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class PhaseUpdate(BaseModel):
    phase: str

class ActivateCard(BaseModel):
    use_case_id: Optional[UUID] = None
