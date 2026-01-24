from pydantic import BaseModel
from uuid import UUID

from typing import Optional

class JoinRequest(BaseModel):
    pin: str
    display_name: str
    role: Optional[str] = "PARTICIPANT" # PARTICIPANT or FACILITATOR

class JoinResponse(BaseModel):
    participant_id: UUID
    workshop_id: UUID
    workshop_title: str
    workshop_status: str
    role: str

class RoleUpdate(BaseModel):
    role: str # FACILITATOR, PARTICIPANT

