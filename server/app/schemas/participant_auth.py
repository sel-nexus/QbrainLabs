"""
Participant Authentication Schemas
Supports both registered and anonymous participation modes
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional
from enum import Enum


class ParticipantMode(str, Enum):
    ANONYMOUS = "anonymous"
    REGISTERED = "registered"


class ParticipantRegister(BaseModel):
    """Schema for participant registration"""
    email: EmailStr
    password: str
    display_name: str
    organization: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v
    
    @validator('display_name')
    def display_name_valid(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Display name must be at least 2 characters long')
        return v.strip()


class ParticipantLogin(BaseModel):
    """Schema for participant login"""
    email: EmailStr
    password: str


class ParticipantAnonymousJoin(BaseModel):
    """Schema for anonymous workshop join"""
    workshop_pin: str
    display_name: str
    
    @validator('display_name')
    def display_name_valid(cls, v):
        if len(v.strip()) < 2:
            raise ValueError('Display name must be at least 2 characters long')
        return v.strip()


class ParticipantRegisteredJoin(BaseModel):
    """Schema for registered participant joining a workshop"""
    workshop_pin: str


class ParticipantResponse(BaseModel):
    """Response schema for participant data"""
    id: str
    email: Optional[str] = None
    display_name: str
    organization: Optional[str] = None
    is_registered: bool = False
    total_workshops_attended: int = 0
    total_use_cases_submitted: int = 0
    total_votes_cast: int = 0
    
    class Config:
        from_attributes = True


class ParticipantToken(BaseModel):
    """Token response for participant authentication"""
    access_token: str
    token_type: str = "bearer"
    participant: ParticipantResponse
    mode: ParticipantMode


class ParticipantProfile(BaseModel):
    """Schema for updating participant profile"""
    display_name: Optional[str] = None
    organization: Optional[str] = None
    
    @validator('display_name')
    def display_name_valid(cls, v):
        if v and len(v.strip()) < 2:
            raise ValueError('Display name must be at least 2 characters long')
        return v.strip() if v else v


class ParticipantContribution(BaseModel):
    """Schema for participant contribution history"""
    workshop_id: str
    workshop_title: str
    joined_at: str
    use_cases_submitted: int
    votes_cast: int
    role: str


class ParticipantStats(BaseModel):
    """Aggregated participant statistics"""
    total_workshops: int
    total_use_cases: int
    total_votes: int
    contribution_history: list[ParticipantContribution]
