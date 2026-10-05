"""
LLM Model Configuration Registry
Admin-managed registry of LLM provider configs, tagged by role
(embedding / decision / reasoning), selectable per workshop.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.models import GUID, JSONType


class LLMProvider(str, enum.Enum):
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    ANTHROPIC = "anthropic"
    TYPESAFE_AI = "typesafe_ai"


class LLMRole(str, enum.Enum):
    EMBEDDING = "embedding"
    DECISION = "decision"
    REASONING = "reasoning"


class LLMModelConfig(Base):
    __tablename__ = "llm_model_configs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    provider = Column(String(50), nullable=False)
    role = Column(String(50), nullable=False)
    model_name = Column(String(200), nullable=False)
    config_json = Column(JSONType, default=dict, nullable=False)
    encrypted_api_key = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User", foreign_keys=[created_by])
