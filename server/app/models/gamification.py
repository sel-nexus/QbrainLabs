"""
Gamification & Engagement Models
Implements US15: Gamification System (Points, Badges, Leaderboards)
"""
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base
from app.models.models import GUID, JSONType

class BadgeRarity(str, enum.Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"

class ParticipantPoint(Base):
    """
    Points earned by participants for various actions.
    """
    __tablename__ = "participant_points"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    points = Column(Integer, default=0)
    action = Column(String(50)) # e.g., 'submit_use_case', 'vote'
    # action_metadata = Column(JSONType, nullable=True) # Extra info about the action
    created_at = Column(DateTime, default=datetime.utcnow)

    participant = relationship("Participant", backref="points_history")
    workshop = relationship("Workshop", backref="points_history")

class Badge(Base):
    """
    Badge definitions.
    """
    __tablename__ = "badges"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    icon = Column(String(50)) # SVG or icon name
    description = Column(String(500))
    rarity = Column(String(20), default=BadgeRarity.COMMON.value)
    criteria = Column(JSONType, nullable=True) # Rules for awarding this badge
    created_at = Column(DateTime, default=datetime.utcnow)

class ParticipantBadge(Base):
    """
    Badges earned by participants.
    """
    __tablename__ = "participant_badges"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    badge_id = Column(GUID(), ForeignKey("badges.id"), nullable=False)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('participant_id', 'badge_id', name='uq_participant_badge'),
    )

    participant = relationship("Participant", backref="earned_badges")
    badge = relationship("Badge")
    workshop = relationship("Workshop")

class Achievement(Base):
    """
    Achievements and milestones.
    """
    __tablename__ = "achievements"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    criteria = Column(JSONType, nullable=True)
    points_reward = Column(Integer, default=0)

class WorkshopTeam(Base):
    """
    Teams within a workshop for competitive gamification.
    """
    __tablename__ = "workshop_teams"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    workshop = relationship("Workshop", backref="teams")

class TeamMember(Base):
    """
    Membership of participants in teams.
    """
    __tablename__ = "team_members"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    team_id = Column(GUID(), ForeignKey("workshop_teams.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)

    team = relationship("WorkshopTeam", backref="members")
    participant = relationship("Participant", backref="team_membership")
