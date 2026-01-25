"""
Knowledge Base Models
US33: Database-Driven Configuration Management

Stores AI use case templates in the database for CRUD operations.
Replaces static JSON files with database-backed content.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class KBIndustry(Base):
    """
    Industry categories for organizing use case templates.
    """
    __tablename__ = "kb_industries"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    slug = Column(String(50), unique=True, nullable=False)  # e.g., 'healthcare'
    name = Column(String(100), nullable=False)  # e.g., 'Healthcare'
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Icon identifier (e.g., 'stethoscope')
    color = Column(String(7), nullable=True)  # Hex color (e.g., '#4F46E5')
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    use_cases = relationship("KBUseCase", back_populates="industry", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<KBIndustry {self.slug}>"

    def to_dict(self, include_use_cases: bool = False):
        result = {
            "id": str(self.id),
            "slug": self.slug,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
            "use_case_count": len(self.use_cases) if self.use_cases else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_use_cases:
            result["use_cases"] = [uc.to_dict() for uc in self.use_cases if uc.is_active]
        return result


class KBUseCase(Base):
    """
    AI use case templates that can be used as starting points for workshops.
    """
    __tablename__ = "kb_use_cases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    industry_id = Column(GUID(), ForeignKey("kb_industries.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)  # e.g., 'Process Automation', 'Predictive Analytics'
    complexity = Column(String(20), default="Medium")  # Low, Medium, High
    
    # Details
    typical_roi = Column(String(255), nullable=True)
    implementation_time = Column(String(100), nullable=True)
    technologies = Column(JSONType, default=list)  # Array of technology names
    key_benefits = Column(JSONType, default=list)
    prerequisites = Column(JSONType, default=list)
    example_kpis = Column(JSONType, default=list)
    
    # Status
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Usage tracking
    view_count = Column(Integer, default=0)
    usage_count = Column(Integer, default=0)  # Times used as template
    
    # Metadata
    created_by = Column(String(50), default="system")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    industry = relationship("KBIndustry", back_populates="use_cases")

    # Indexes
    __table_args__ = (
        Index("idx_kb_industry", "industry_id"),
        Index("idx_kb_category", "category"),
        Index("idx_kb_complexity", "complexity"),
        Index("idx_kb_active", "is_active"),
    )

    def __repr__(self):
        return f"<KBUseCase {self.title}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "industry_id": str(self.industry_id),
            "industry_name": self.industry.name if self.industry else None,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "complexity": self.complexity,
            "typical_roi": self.typical_roi,
            "implementation_time": self.implementation_time,
            "technologies": self.technologies or [],
            "key_benefits": self.key_benefits or [],
            "prerequisites": self.prerequisites or [],
            "example_kpis": self.example_kpis or [],
            "is_featured": self.is_featured,
            "is_active": self.is_active,
            "view_count": self.view_count,
            "usage_count": self.usage_count,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CategoryKeyword(Base):
    """
    Keywords for AI-based category matching.
    Used to automatically categorize use cases based on their content.
    """
    __tablename__ = "category_keywords"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    category = Column(String(100), unique=True, nullable=False)
    keywords = Column(JSONType, nullable=False)  # Array of keywords
    weight = Column(Integer, default=1)  # Keyword matching weight (1-10)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<CategoryKeyword {self.category}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "category": self.category,
            "keywords": self.keywords or [],
            "weight": self.weight,
            "is_active": self.is_active,
        }


class ComplexityRule(Base):
    """
    Rules for determining use case complexity based on keywords.
    """
    __tablename__ = "complexity_rules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    complexity = Column(String(20), unique=True, nullable=False)  # Low, Medium, High
    keywords = Column(JSONType, nullable=False)  # Keywords that indicate this complexity
    threshold = Column(Integer, default=2)  # How many keywords needed to match
    timeline_estimate = Column(String(50), nullable=True)  # e.g., "1-2 months"
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<ComplexityRule {self.complexity}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "complexity": self.complexity,
            "keywords": self.keywords or [],
            "threshold": self.threshold,
            "timeline_estimate": self.timeline_estimate,
            "is_active": self.is_active,
        }


# Default category keywords
DEFAULT_CATEGORY_KEYWORDS = [
    {
        "category": "Process Automation",
        "keywords": ["automate", "workflow", "automation", "robotic", "rpa", "bot", "routine", "repetitive", "manual"],
        "weight": 1,
    },
    {
        "category": "Predictive Analytics",
        "keywords": ["predict", "forecast", "analytics", "ml", "machine learning", "model", "trend", "pattern"],
        "weight": 1,
    },
    {
        "category": "Natural Language Processing",
        "keywords": ["nlp", "text", "language", "chatbot", "sentiment", "document", "extract", "summarize"],
        "weight": 1,
    },
    {
        "category": "Computer Vision",
        "keywords": ["image", "video", "vision", "detect", "recognition", "visual", "camera", "ocr", "scan"],
        "weight": 1,
    },
    {
        "category": "Decision Support",
        "keywords": ["decision", "recommend", "optimize", "suggest", "assist", "support", "advise"],
        "weight": 1,
    },
]

# Default complexity rules
DEFAULT_COMPLEXITY_RULES = [
    {
        "complexity": "Low",
        "keywords": ["simple", "basic", "standard", "template", "rule-based", "existing"],
        "threshold": 2,
        "timeline_estimate": "1-2 months",
    },
    {
        "complexity": "Medium",
        "keywords": ["custom", "integration", "moderate", "multiple", "api", "data pipeline"],
        "threshold": 2,
        "timeline_estimate": "3-6 months",
    },
    {
        "complexity": "High",
        "keywords": ["complex", "enterprise", "advanced", "real-time", "large-scale", "multi-system", "ml model"],
        "threshold": 2,
        "timeline_estimate": "6-12 months",
    },
]
