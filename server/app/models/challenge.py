"""
Challenge Cards Models (US34)
Challenge cards define high-value business/technology problems with success criteria
for AI-led transformation.
"""

from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class ChallengeCard(Base):
    """
    Challenge cards define high-value business/technology problems
    with success criteria for AI-led transformation.
    """
    __tablename__ = "challenge_cards"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(100), nullable=False)
    challenge_description = Column(Text, nullable=False)
    success_criteria = Column(JSONType, nullable=False, default=list)
    display_order = Column(Integer, nullable=False, default=0)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workshop = relationship("Workshop", back_populates="challenge_cards")
    creator = relationship("User", foreign_keys=[created_by])
