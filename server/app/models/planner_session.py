"""
Challenge Planner Session model — stores standalone Business Challenge Planner results.
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class ChallengePlannerSession(Base):
    """Persisted output of the standalone Business Challenge Planner."""

    __tablename__ = "challenge_planner_sessions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    customer_name = Column(String(200), nullable=True)
    customer_about = Column(Text, nullable=True)
    challenge_description = Column(Text, nullable=False)
    steps = Column(JSONType, nullable=False, default=list)  # list of step dicts

    # Optional link to an existing workshop so prompts are accessible during the session
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="SET NULL"), nullable=True)

    created_by = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
    workshop = relationship("Workshop", foreign_keys=[workshop_id])
