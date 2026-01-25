from datetime import datetime
import enum
import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.models import GUID, JSONType

class PollType(str, enum.Enum):
    MULTIPLE_CHOICE = "MULTIPLE_CHOICE"
    MULTIPLE_SELECT = "MULTIPLE_SELECT"
    RATING_SCALE = "RATING_SCALE"
    YES_NO = "YES_NO"
    OPEN_TEXT = "OPEN_TEXT"
    RANKING = "RANKING"

class PollStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"

class Poll(Base):
    __tablename__ = "polls"
    __table_args__ = {'extend_existing': True}

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    poll_type = Column(String, nullable=False) # Enum PollType
    status = Column(String, default=PollStatus.DRAFT)
    options = Column(JSONType, default=[]) # List of strings for simple options, or objects
    created_at = Column(DateTime, default=datetime.utcnow)
    is_anonymous = Column(Boolean, default=False)
    
    # Relationships
    workshop = relationship("Workshop", backref="polls")
    responses = relationship("PollResponse", back_populates="poll", cascade="all, delete-orphan")

class PollResponse(Base):
    __tablename__ = "poll_responses"
    __table_args__ = {'extend_existing': True}

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    poll_id = Column(GUID(), ForeignKey("polls.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=True) # Null if strictly anonymous, though typically we track unique user even if hidden
    response_data = Column(JSONType, nullable=False) 
    created_at = Column(DateTime, default=datetime.utcnow)
    
    poll = relationship("Poll", back_populates="responses")
    participant = relationship("Participant") 

class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = {'extend_existing': True}

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    reaction_type = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    participant = relationship("Participant")

class Question(Base):
    __tablename__ = "questions"
    __table_args__ = {'extend_existing': True}

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    content = Column(Text, nullable=False)
    is_answered = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    is_anonymous = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    participant = relationship("Participant")
    upvotes = relationship("QuestionUpvote", back_populates="question", cascade="all, delete-orphan")

class QuestionUpvote(Base):
    __tablename__ = "question_upvotes"
    __table_args__ = {'extend_existing': True}

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    question_id = Column(GUID(), ForeignKey("questions.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    question = relationship("Question", back_populates="upvotes")
