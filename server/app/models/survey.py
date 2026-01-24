from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Integer, DateTime
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
import enum

from app.core.database import Base
from app.models.models import GUID, JSONType


class SurveyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class QuestionType(str, enum.Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    MULTIPLE_SELECT = "multiple_select"
    RATING = "rating"
    TEXT = "text"
    TEXTAREA = "textarea"
    LIKERT = "likert"


class Survey(Base):
    __tablename__ = "surveys"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    facilitator_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default=SurveyStatus.DRAFT)
    
    # Survey settings stored as JSON
    settings = Column(JSONType, default=lambda: {
        "anonymous": True,
        "allow_multiple_submissions": False,
        "show_results_to_participants": False,
        "deadline": None,
        "auto_close": False
    })
    
    # Template reference if created from template
    template_id = Column(String(50), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    activated_at = Column(DateTime, nullable=True)
    paused_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Relationships
    workshop = relationship("Workshop", backref="surveys")
    facilitator = relationship("User", backref="created_surveys")
    questions = relationship("SurveyQuestion", back_populates="survey", cascade="all, delete-orphan", order_by="SurveyQuestion.order")
    responses = relationship("SurveyResponse", back_populates="survey", cascade="all, delete-orphan")


class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    survey_id = Column(GUID(), ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    
    order = Column(Integer, nullable=False, default=0)
    text = Column(Text, nullable=False)
    type = Column(String(20), nullable=False)  # QuestionType enum value
    required = Column(Boolean, default=True)
    
    # Options for multiple choice/select questions (stored as JSON array)
    options = Column(JSONType, nullable=True)
    
    # Additional configuration (scale, labels, validation rules, etc.)
    config = Column(JSONType, default=lambda: {})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    survey = relationship("Survey", back_populates="questions")
    answers = relationship("SurveyAnswer", back_populates="question", cascade="all, delete-orphan")


class SurveyResponse(Base):
    __tablename__ = "survey_responses"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    survey_id = Column(GUID(), ForeignKey("surveys.id", ondelete="CASCADE"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=True)  # Nullable for anonymous
    
    # Response status
    status = Column(String(20), default="in_progress")  # not_started, in_progress, completed
    current_question = Column(Integer, nullable=True)
    
    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    survey = relationship("Survey", back_populates="responses")
    participant = relationship("Participant", backref="survey_responses")
    answers = relationship("SurveyAnswer", back_populates="response", cascade="all, delete-orphan")


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    response_id = Column(GUID(), ForeignKey("survey_responses.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(GUID(), ForeignKey("survey_questions.id", ondelete="CASCADE"), nullable=False)
    
    # Answer value - stored as JSON to handle different question types
    # For multiple_choice: "option_value"
    # For multiple_select: ["option1", "option2"]
    # For rating: 4
    # For text/textarea: "text response"
    # For likert: {"statement1": 4, "statement2": 3}
    value = Column(JSONType, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    response = relationship("SurveyResponse", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")


class SurveyTemplate(Base):
    __tablename__ = "survey_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    industry = Column(String(50), nullable=False)  # healthcare, finance, retail, etc.
    category = Column(String(50), nullable=False)  # pre_workshop, post_workshop, validation, etc.
    
    # Template questions stored as JSON array
    questions = Column(JSONType, default=list)
    
    # Metadata
    tags = Column(JSONType, default=list)
    is_public = Column(Boolean, default=True)
    usage_count = Column(Integer, default=0)
    created_by = Column(String(50), default="system")  # "system" or user ID
    
    created_at = Column(DateTime, default=datetime.utcnow)
