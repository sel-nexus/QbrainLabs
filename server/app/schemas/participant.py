from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class JoinRequest(BaseModel):
    pin: str
    display_name: str
    role: Optional[str] = "PARTICIPANT" # PARTICIPANT or FACILITATOR


class UseCaseSummary(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SurveySummary(BaseModel):
    id: UUID
    title: str
    status: str
    completed: bool = False

    class Config:
        from_attributes = True


class ParticipantSessionInfo(BaseModel):
    workshop_id: UUID
    workshop_title: str
    workshop_status: str
    current_phase: str
    use_cases: List[UseCaseSummary] = []
    surveys: List[SurveySummary] = []

    class Config:
        from_attributes = True

class JoinResponse(BaseModel):
    participant_id: UUID
    workshop_id: UUID
    workshop_title: str
    workshop_status: str
    role: str

class RoleUpdate(BaseModel):
    role: str # FACILITATOR, PARTICIPANT


class ParticipantResponse(BaseModel):
    id: UUID
    display_name: str
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True

