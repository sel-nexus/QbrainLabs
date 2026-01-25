"""
Breakout Rooms & Team Collaboration Models (US18)
Supports virtual breakout rooms for small group collaboration
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime, Integer, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class BreakoutRoomStatus(str):
    """Breakout room status"""
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class BreakoutRoom(Base):
    """
    Breakout room for small group collaboration within a workshop.
    """
    __tablename__ = "breakout_rooms"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False, index=True)
    
    # Basic Info
    name = Column(String(100), nullable=False)
    max_capacity = Column(Integer, default=8)
    activity_type = Column(String(50), nullable=True)  # ideation, scoring, discussion, etc.
    
    # Status & Timing
    status = Column(String(20), default=BreakoutRoomStatus.PENDING)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    
    # Configuration
    assignment_method = Column(String(50), nullable=True)  # random, self_select, balanced, etc.
    auto_return = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workshop = relationship("Workshop", foreign_keys=[workshop_id])
    assignments = relationship("RoomAssignment", back_populates="room", cascade="all, delete-orphan")
    canvas_items = relationship("CanvasItem", back_populates="room", cascade="all, delete-orphan")
    messages = relationship("RoomMessage", back_populates="room", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_breakout_rooms_workshop_status', 'workshop_id', 'status'),
    )


class RoomAssignment(Base):
    """
    Participant assignments to breakout rooms.
    """
    __tablename__ = "room_assignments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    room_id = Column(GUID(), ForeignKey("breakout_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False, index=True)
    
    # Timing
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    
    # Relationships
    room = relationship("BreakoutRoom", back_populates="assignments")
    participant = relationship("Participant")
    
    __table_args__ = (
        Index('ix_room_assignments_unique', 'room_id', 'participant_id', unique=True),
    )


class CanvasItem(Base):
    """
    Items on the collaborative canvas (sticky notes, shapes, text).
    """
    __tablename__ = "canvas_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    room_id = Column(GUID(), ForeignKey("breakout_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    item_type = Column(String(20), nullable=False)  # sticky, text, shape
    position = Column(JSONType, nullable=True)  # {x, y}
    color = Column(String(20), nullable=True)
    
    # Metadata
    category = Column(String(50), nullable=True)  # For grouping/tagging
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    room = relationship("BreakoutRoom", back_populates="canvas_items")
    participant = relationship("Participant")
    votes = relationship("CanvasVote", back_populates="item", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('ix_canvas_items_room', 'room_id'),
    )


class CanvasVote(Base):
    """
    Votes on canvas items (for dot voting, consensus building).
    """
    __tablename__ = "canvas_votes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    item_id = Column(GUID(), ForeignKey("canvas_items.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    
    # Vote Details
    vote_type = Column(String(20), nullable=True)  # upvote, downvote, agree, etc.
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    item = relationship("CanvasItem", back_populates="votes")
    participant = relationship("Participant")
    
    __table_args__ = (
        Index('ix_canvas_votes_unique', 'item_id', 'participant_id', unique=True),
    )


class RoomMessage(Base):
    """
    Chat messages within breakout rooms.
    """
    __tablename__ = "room_messages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    room_id = Column(GUID(), ForeignKey("breakout_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    
    # Message Content
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    room = relationship("BreakoutRoom", back_populates="messages")
    participant = relationship("Participant")
    
    __table_args__ = (
        Index('ix_room_messages_room_created', 'room_id', 'created_at'),
    )
