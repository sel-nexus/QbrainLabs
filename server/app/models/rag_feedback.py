"""
Database models for RAG feedback and knowledge base management.

This module defines the database schema for:
- AI response feedback collection
- RAG document tracking
- Quality metrics storage
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.models.models import Base
import uuid


class AIFeedback(Base):
    """Store user feedback on AI-generated responses."""
    __tablename__ = "ai_feedback"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Context
    workshop_id = Column(String, ForeignKey("workshops.id"), nullable=True)
    use_case_id = Column(String, ForeignKey("use_cases.id"), nullable=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # AI Request Info
    endpoint = Column(String, nullable=False)  # e.g., "/ai/enhance", "/ai/feasibility"
    request_data = Column(JSON, nullable=False)  # Original request payload
    response_data = Column(JSON, nullable=False)  # AI response
    
    # Feedback
    rating = Column(Integer, nullable=True)  # 1-5 stars
    is_helpful = Column(Boolean, nullable=True)  # Thumbs up/down
    feedback_text = Column(Text, nullable=True)  # Optional text feedback
    
    # Metadata
    response_time_ms = Column(Integer, nullable=True)  # Response time in milliseconds
    model_used = Column(String, nullable=True)  # Which model was used
    is_mock = Column(Boolean, default=False)  # Whether mock mode was used
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workshop = relationship("Workshop", backref="ai_feedback")
    use_case = relationship("UseCase", backref="ai_feedback")


class RAGDocument(Base):
    """Track documents in the RAG knowledge base."""
    __tablename__ = "rag_documents"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Document Info
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=True)  # e.g., "use_case", "best_practice"
    source = Column(String, nullable=True)  # Where the document came from
    
    # Metadata
    doc_metadata = Column(JSON, nullable=True)  # Additional metadata (renamed from metadata to avoid SQLAlchemy conflict)
    embedding_id = Column(String, nullable=True)  # Reference to vector store
    
    # Status
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Usage tracking
    retrieval_count = Column(Integer, default=0)  # How many times retrieved
    last_retrieved_at = Column(DateTime, nullable=True)


class RAGMetric(Base):
    """Store quality metrics for RAG system."""
    __tablename__ = "rag_metrics"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Metric Info
    metric_type = Column(String, nullable=False)  # e.g., "response_quality", "retrieval_accuracy"
    metric_value = Column(Float, nullable=False)
    
    # Context
    endpoint = Column(String, nullable=True)
    model_used = Column(String, nullable=True)
    
    # Aggregation
    period = Column(String, nullable=False)  # e.g., "hourly", "daily", "weekly"
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Details
    sample_count = Column(Integer, default=0)
    details = Column(JSON, nullable=True)  # Additional metric details
    
    created_at = Column(DateTime, default=datetime.utcnow)


class PromptTemplate(Base):
    """Store and version control prompt templates."""
    __tablename__ = "prompt_templates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Template Info
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    template_text = Column(Text, nullable=False)
    
    # Categorization
    endpoint = Column(String, nullable=False)  # Which endpoint uses this
    category = Column(String, nullable=True)
    
    # Versioning
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    
    # A/B Testing
    variant = Column(String, nullable=True)  # e.g., "A", "B", "control"
    success_rate = Column(Float, nullable=True)  # Based on feedback
    usage_count = Column(Integer, default=0)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
