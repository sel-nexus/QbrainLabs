"""
LLM Usage Tracking Model
Tracks all LLM/AI API calls for monitoring and cost tracking.
"""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID


class LLMUsageLog(Base):
    """
    Tracks LLM usage for monitoring, analytics, and cost tracking.
    Records token usage per feature, workshop, and user.
    """
    __tablename__ = "llm_usage_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Feature identification
    feature = Column(String(50), nullable=False, index=True)  # e.g., "enhance", "roi", "summary", "copilot"
    
    # Context (nullable - system-level calls may not have these)
    workshop_id = Column(GUID(), ForeignKey("workshops.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Token tracking
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    # Request metadata
    model_name = Column(String(100), nullable=True)  # e.g., "gpt-4", "gpt-35-turbo"
    request_type = Column(String(50), default="chat")  # e.g., "chat", "embedding", "vision"
    
    # Cost tracking (in cents for precision)
    estimated_cost_cents = Column(Integer, default=0)
    
    # Status
    success = Column(String(10), default="true")  # "true", "false", "error"
    error_message = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    __table_args__ = (
        Index('ix_llm_usage_feature_date', 'feature', 'created_at'),
        Index('ix_llm_usage_workshop', 'workshop_id'),
        Index('ix_llm_usage_user', 'user_id'),
    )
