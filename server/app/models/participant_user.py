"""
Registered Participant User Model
Supports optional registration for participants to track contributions across workshops
"""

from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class RegisteredParticipant(Base):
    """
    Registered participant user model.
    Allows participants to optionally create accounts to track their contributions.
    """
    __tablename__ = "registered_participants"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    display_name = Column(String, nullable=False)
    organization = Column(String, nullable=True)
    
    # Account status
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    
    # Statistics (denormalized for quick access)
    total_workshops_attended = Column(Integer, default=0)
    total_use_cases_submitted = Column(Integer, default=0)
    total_votes_cast = Column(Integer, default=0)
    
    # Preferences
    preferences = Column(JSONType, default={})
    
    # Relationships
    workshop_participations = relationship("ParticipantWorkshopLink", back_populates="registered_participant")


class ParticipantWorkshopLink(Base):
    """
    Links registered participants to their workshop participations.
    Allows tracking contribution history across workshops.
    """
    __tablename__ = "participant_workshop_links"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    registered_participant_id = Column(GUID(), ForeignKey("registered_participants.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    
    # Track contribution in this workshop
    use_cases_submitted = Column(Integer, default=0)
    votes_cast = Column(Integer, default=0)
    
    # Timestamps
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    registered_participant = relationship("RegisteredParticipant", back_populates="workshop_participations")
