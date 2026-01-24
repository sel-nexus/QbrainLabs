"""
Template Marketplace Models
Supports publishing, rating, and sharing of survey/workshop templates
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, Text, DateTime, Integer, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class TemplateCategory(str):
    WORKSHOP = "WORKSHOP"
    SURVEY = "SURVEY"
    SCORING_CRITERIA = "SCORING_CRITERIA"


class TemplateStatus(str):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    REJECTED = "REJECTED"


class MarketplaceTemplate(Base):
    """
    Template available in the marketplace for users to discover and use.
    """
    __tablename__ = "marketplace_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    short_description = Column(String(500), nullable=False)
    long_description = Column(Text, nullable=True)
    
    # Categorization
    category = Column(String(50), nullable=False)  # WORKSHOP, SURVEY, SCORING_CRITERIA
    industry = Column(String(100), nullable=True)
    tags = Column(JSONType, default=[])
    
    # Content
    template_data = Column(JSONType, nullable=False)  # The actual template content
    preview_image_url = Column(String(500), nullable=True)
    sample_output_url = Column(String(500), nullable=True)
    
    # Author
    author_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=True)
    
    # Pricing
    is_free = Column(Boolean, default=True)
    price_credits = Column(Integer, default=0)
    
    # Status
    status = Column(String(20), default=TemplateStatus.DRAFT)
    is_featured = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Metrics
    usage_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    rating_sum = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    
    # Versioning
    version = Column(String(20), default="1.0.0")
    changelog = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)
    
    # Relationships
    author = relationship("User", foreign_keys=[author_id])
    reviews = relationship("TemplateReview", back_populates="template", cascade="all, delete-orphan")
    downloads = relationship("TemplateDownload", back_populates="template", cascade="all, delete-orphan")
    
    @property
    def average_rating(self):
        if self.rating_count == 0:
            return 0.0
        return round(self.rating_sum / self.rating_count, 1)


class TemplateReview(Base):
    """
    User reviews and ratings for marketplace templates.
    """
    __tablename__ = "template_reviews"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    template_id = Column(GUID(), ForeignKey("marketplace_templates.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    # Review content
    rating = Column(Integer, nullable=False)  # 1-5 stars
    title = Column(String(200), nullable=True)
    comment = Column(Text, nullable=True)
    
    # Helpful votes
    helpful_count = Column(Integer, default=0)
    
    # Status
    is_verified_purchase = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    template = relationship("MarketplaceTemplate", back_populates="reviews")
    user = relationship("User")


class TemplateDownload(Base):
    """
    Tracks template downloads/usage.
    """
    __tablename__ = "template_downloads"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    template_id = Column(GUID(), ForeignKey("marketplace_templates.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    # Context
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=True)
    
    # Timestamps
    downloaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    template = relationship("MarketplaceTemplate", back_populates="downloads")
    user = relationship("User")


class TemplateFavorite(Base):
    """
    User's favorite/saved templates.
    """
    __tablename__ = "template_favorites"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    template_id = Column(GUID(), ForeignKey("marketplace_templates.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    template = relationship("MarketplaceTemplate")
    user = relationship("User")


class TemplateCollection(Base):
    """
    Curated collections of templates.
    """
    __tablename__ = "template_collections"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    
    # Curator
    curator_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    is_official = Column(Boolean, default=False)
    
    # Status
    is_public = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    curator = relationship("User")
    items = relationship("TemplateCollectionItem", back_populates="collection", cascade="all, delete-orphan")


class TemplateCollectionItem(Base):
    """
    Templates within a collection.
    """
    __tablename__ = "template_collection_items"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    collection_id = Column(GUID(), ForeignKey("template_collections.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(GUID(), ForeignKey("marketplace_templates.id", ondelete="CASCADE"), nullable=False)
    
    # Ordering
    position = Column(Integer, default=0)
    
    # Timestamps
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    collection = relationship("TemplateCollection", back_populates="items")
    template = relationship("MarketplaceTemplate")
