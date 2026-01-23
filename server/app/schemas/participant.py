from pydantic import BaseModel
from uuid import UUID

class JoinRequest(BaseModel):
    pin: str
    display_name: str

class JoinResponse(BaseModel):
    participant_id: UUID
    workshop_id: UUID
    workshop_title: str
    workshop_status: str
