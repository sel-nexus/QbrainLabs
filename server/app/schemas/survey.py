from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class SurveyStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class QuestionTypeEnum(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    MULTIPLE_SELECT = "multiple_select"
    RATING = "rating"
    TEXT = "text"
    TEXTAREA = "textarea"
    LIKERT = "likert"


# Question Configuration schemas
class QuestionConfig(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None
    scale: Optional[int] = None
    labels: Optional[List[str]] = None
    max_length: Optional[int] = None
    validation: Optional[str] = None
    statements: Optional[List[str]] = None  # For Likert scale


# Survey Settings
class SurveySettings(BaseModel):
    anonymous: bool = True
    allow_multiple_submissions: bool = False
    show_results_to_participants: bool = False
    deadline: Optional[datetime] = None
    auto_close: bool = False


# Question schemas
class QuestionBase(BaseModel):
    text: str
    type: QuestionTypeEnum
    required: bool = True
    options: Optional[List[str]] = None
    config: Optional[QuestionConfig] = None


class QuestionCreate(QuestionBase):
    order: Optional[int] = None


class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[str]] = None
    config: Optional[QuestionConfig] = None


class QuestionResponse(QuestionBase):
    id: str
    order: int
    created_at: datetime

    class Config:
        from_attributes = True


# Survey schemas
class SurveyBase(BaseModel):
    title: str
    description: Optional[str] = None


class SurveyCreate(SurveyBase):
    questions: Optional[List[QuestionCreate]] = []
    settings: Optional[SurveySettings] = None
    template_id: Optional[str] = None


class SurveyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[SurveySettings] = None


class SurveyResponse(SurveyBase):
    id: str
    workshop_id: str
    facilitator_id: str
    status: SurveyStatusEnum
    settings: Dict[str, Any]
    template_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    activated_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    questions: List[QuestionResponse] = []

    class Config:
        from_attributes = True


class SurveyListItem(BaseModel):
    id: str
    title: str
    status: SurveyStatusEnum
    question_count: int
    response_count: int
    created_at: datetime
    activated_at: Optional[datetime] = None


class SurveyListResponse(BaseModel):
    surveys: List[SurveyListItem]


# Survey Response (participant submission) schemas
class AnswerSubmit(BaseModel):
    question_id: str
    value: Any  # Can be string, number, list, or dict depending on question type


class SurveySubmissionCreate(BaseModel):
    answers: List[AnswerSubmit]


class SurveySubmissionPartial(BaseModel):
    question_id: str
    value: Any


class ParticipantSurveyStatus(BaseModel):
    participant_id: Optional[str] = None
    participant_name: Optional[str] = None
    status: str  # not_started, in_progress, completed
    current_question: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# Progress tracking
class SurveyProgress(BaseModel):
    total_participants: int
    started_count: int
    completed_count: int
    completion_rate: float
    average_time_seconds: Optional[float] = None
    participants: List[ParticipantSurveyStatus] = []


# Results schemas
class OptionDistribution(BaseModel):
    option: str
    count: int
    percentage: float


class QuestionResults(BaseModel):
    question_id: str
    text: str
    type: QuestionTypeEnum
    response_count: int
    distribution: Optional[List[OptionDistribution]] = None  # For choice questions
    average: Optional[float] = None  # For rating/likert
    median: Optional[float] = None
    responses: Optional[List[str]] = None  # For text questions
    word_frequency: Optional[List[Dict[str, Any]]] = None  # For word cloud


class SurveyResults(BaseModel):
    survey_id: str
    total_responses: int
    questions: List[QuestionResults]
    last_updated: datetime


# Word cloud
class WordCloudItem(BaseModel):
    text: str
    frequency: int
    weight: int  # 1-100 scale for visualization


class WordCloudResponse(BaseModel):
    words: List[WordCloudItem]
    total_responses: int
    last_updated: datetime


# Template schemas
class TemplateQuestion(BaseModel):
    text: str
    type: QuestionTypeEnum
    required: bool = True
    options: Optional[List[str]] = None
    config: Optional[QuestionConfig] = None


class SurveyTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    industry: str
    category: str
    questions: List[TemplateQuestion] = []
    tags: List[str] = []


class SurveyTemplateResponse(SurveyTemplateBase):
    id: str
    is_public: bool
    usage_count: int
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateListItem(BaseModel):
    id: str
    name: str
    industry: str
    category: str
    description: Optional[str] = None
    question_count: int
    preview_questions: List[str] = []


class TemplateListResponse(BaseModel):
    templates: List[TemplateListItem]


# Lifecycle actions
class ActivateSurveyRequest(BaseModel):
    pass


class PauseSurveyRequest(BaseModel):
    reason: Optional[str] = None


class ResumeSurveyRequest(BaseModel):
    pass


class CloseSurveyRequest(BaseModel):
    pass
