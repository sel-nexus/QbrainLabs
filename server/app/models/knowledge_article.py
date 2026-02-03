"""
Knowledge Article Models
Stores imported research documents and validation status for RAG integration
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, Integer, ForeignKey, Index, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class ValidationStatus(str):
    """Validation status constants"""
    PENDING = "pending"
    VALIDATED = "validated"
    REJECTED = "rejected"


class KnowledgeArticle(Base):
    """
    Stores imported knowledge articles with validation metadata.
    Articles are stored in RAG vector database for semantic search.
    """
    __tablename__ = "knowledge_articles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Article content
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)  # AI-generated summary
    
    # Source information
    source_type = Column(String(50), nullable=False)  # pdf, docx, url, manual, etc.
    source_url = Column(String(1000), nullable=True)
    source_filename = Column(String(255), nullable=True)
    
    # Validation
    validation_status = Column(String(20), default=ValidationStatus.PENDING, nullable=False)
    validation_score = Column(Float, nullable=True)  # 0-100 confidence score
    validation_sources = Column(JSONType, default=list)  # List of research sources
    validation_notes = Column(Text, nullable=True)
    
    # RAG integration
    embedding_id = Column(String(255), nullable=True)  # Reference to vector store
    embedding_model = Column(String(100), nullable=True)  # Model used for embeddings
    
    # Metadata
    imported_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    imported_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    validated_at = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    importer = relationship("User", foreign_keys=[imported_by])
    usecase_links = relationship("UseCaseKnowledgeLink", back_populates="article", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_knowledge_validation_status", "validation_status"),
        Index("idx_knowledge_imported_by", "imported_by"),
        Index("idx_knowledge_source_type", "source_type"),
        Index("idx_knowledge_active", "is_active"),
    )

    def __repr__(self):
        return f"<KnowledgeArticle {self.title[:50]}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "title": self.title,
            "content": self.content,
            "summary": self.summary,
            "source_type": self.source_type,
            "source_url": self.source_url,
            "source_filename": self.source_filename,
            "validation_status": self.validation_status,
            "validation_score": self.validation_score,
            "validation_sources": self.validation_sources or [],
            "validation_notes": self.validation_notes,
            "embedding_id": self.embedding_id,
            "embedding_model": self.embedding_model,
            "imported_by": str(self.imported_by),
            "imported_at": self.imported_at.isoformat() if self.imported_at else None,
            "validated_at": self.validated_at.isoformat() if self.validated_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "linked_usecases_count": len(self.usecase_links) if self.usecase_links else 0,
        }


class ImpactType(str):
    """Impact type constants"""
    ADDITION = "addition"  # New information to add
    REFINEMENT = "refinement"  # Improve existing content
    VALIDATION = "validation"  # Validates existing content
    CORRECTION = "correction"  # Corrects existing content


class UseCaseKnowledgeLink(Base):
    """
    Links use cases to knowledge articles.
    Tracks how knowledge articles impact use cases.
    """
    __tablename__ = "usecase_knowledge_links"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Relationships
    usecase_id = Column(GUID(), ForeignKey("kb_use_cases.id", ondelete="CASCADE"), nullable=False)
    article_id = Column(GUID(), ForeignKey("knowledge_articles.id", ondelete="CASCADE"), nullable=False)
    
    # Impact analysis
    relevance_score = Column(Float, nullable=False)  # 0-100 how relevant
    impact_type = Column(String(20), nullable=False)  # addition, refinement, validation, correction
    
    # Suggested changes (JSON with proposed modifications)
    suggested_changes = Column(JSONType, default=dict)
    
    # Status
    status = Column(String(20), default="pending")  # pending, approved, rejected, applied
    applied_at = Column(DateTime, nullable=True)
    applied_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    usecase = relationship("KBUseCase", backref="knowledge_links")
    article = relationship("KnowledgeArticle", back_populates="usecase_links")
    applier = relationship("User", foreign_keys=[applied_by])
    
    # Indexes
    __table_args__ = (
        Index("idx_link_usecase", "usecase_id"),
        Index("idx_link_article", "article_id"),
        Index("idx_link_status", "status"),
        Index("idx_link_impact_type", "impact_type"),
    )

    def __repr__(self):
        return f"<UseCaseKnowledgeLink usecase={self.usecase_id} article={self.article_id}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "usecase_id": str(self.usecase_id),
            "article_id": str(self.article_id),
            "relevance_score": self.relevance_score,
            "impact_type": self.impact_type,
            "suggested_changes": self.suggested_changes or {},
            "status": self.status,
            "applied_at": self.applied_at.isoformat() if self.applied_at else None,
            "applied_by": str(self.applied_by) if self.applied_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
