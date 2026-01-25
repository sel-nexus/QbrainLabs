"""
Workshop Templates & Industry Packages Models (US22)
Supports pre-built workshop templates, industry packages, and use case libraries
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime, Integer, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class WorkshopTemplate(Base):
    """
    Pre-built workshop templates that facilitators can use to quickly create workshops.
    """
    __tablename__ = "workshop_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False)  # AI_STRATEGY, INNOVATION_SPRINT, EXECUTIVE_BRIEFING, etc.
    industry = Column(String(50), nullable=True)  # Healthcare, Finance, Retail, etc.
    description = Column(Text, nullable=True)
    
    # Template Configuration
    config = Column(JSONType, nullable=False)  # Workshop config (criteria weights, settings)
    phases = Column(JSONType, nullable=True)  # Pre-configured phases and timing
    criteria = Column(JSONType, nullable=False)  # Default scoring criteria
    
    # Additional Content
    agenda = Column(Text, nullable=True)  # Suggested agenda
    facilitator_guide = Column(Text, nullable=True)  # Facilitator guide
    participant_materials = Column(JSONType, nullable=True)  # Participant materials
    sample_use_cases = Column(JSONType, nullable=True)  # Sample use cases to pre-populate
    
    # Visibility & Sharing
    is_public = Column(Boolean, default=False)
    author_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    # Metrics
    usage_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)  # Average rating (0-5)
    rating_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    
    __table_args__ = (
        Index('ix_workshop_templates_category', 'category'),
        Index('ix_workshop_templates_industry', 'industry'),
        Index('ix_workshop_templates_is_public', 'is_public'),
    )


class IndustryPackage(Base):
    """
    Industry-specific content packages with use cases, criteria, and benchmarks.
    """
    __tablename__ = "industry_packages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    industry = Column(String(50), nullable=False, unique=True, index=True)
    
    # Content
    use_cases = Column(JSONType, nullable=False)  # Array of use case templates
    criteria = Column(JSONType, nullable=False)  # Industry-specific criteria
    benchmarks = Column(JSONType, nullable=True)  # Industry benchmarks
    regulatory_considerations = Column(Text, nullable=True)
    case_studies = Column(JSONType, nullable=True)  # Case studies and examples
    
    # Metadata
    description = Column(Text, nullable=True)
    use_case_count = Column(Integer, default=0)
    template_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UseCaseLibrary(Base):
    """
    Library of pre-built AI use cases that can be imported into workshops.
    """
    __tablename__ = "use_case_library"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # Customer Experience, Operations, Revenue, etc.
    industry = Column(String(50), nullable=True)
    ai_technology = Column(String(50), nullable=True)  # ML, NLP, Computer Vision, etc.
    complexity = Column(String(20), nullable=True)  # Low, Medium, High
    
    # Details
    kpis = Column(JSONType, nullable=True)  # KPIs and success metrics
    target_user = Column(String(100), nullable=True)
    proposed_solution = Column(Text, nullable=True)
    
    # Metadata
    tags = Column(JSONType, default=[])
    similar_use_cases = Column(JSONType, nullable=True)  # IDs of similar use cases
    
    # Usage Tracking
    import_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_use_case_library_category', 'category'),
        Index('ix_use_case_library_industry', 'industry'),
        Index('ix_use_case_library_complexity', 'complexity'),
    )


class CriteriaTemplate(Base):
    """
    Pre-built criteria sets for different evaluation approaches.
    """
    __tablename__ = "criteria_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)  # STANDARD_7_POINT, QUICK_3_POINT, EXECUTIVE_VIEW, etc.
    
    # Criteria Configuration
    criteria = Column(JSONType, nullable=False)  # Array of criteria with weights
    
    # Usage
    usage_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('ix_criteria_templates_category', 'category'),
    )
