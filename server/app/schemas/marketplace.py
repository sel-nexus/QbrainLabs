"""
Template Marketplace Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TemplateCategory(str, Enum):
    WORKSHOP = "WORKSHOP"
    SURVEY = "SURVEY"
    SCORING_CRITERIA = "SCORING_CRITERIA"


class TemplateStatus(str, Enum):
    DRAFT = "DRAFT"
    PENDING_REVIEW = "PENDING_REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    REJECTED = "REJECTED"


# Template Schemas
class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    short_description: str = Field(..., min_length=10, max_length=500)
    long_description: Optional[str] = None
    category: TemplateCategory
    industry: Optional[str] = None
    tags: List[str] = []
    template_data: dict
    preview_image_url: Optional[str] = None
    is_free: bool = True
    price_credits: int = 0


class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    short_description: Optional[str] = Field(None, min_length=10, max_length=500)
    long_description: Optional[str] = None
    industry: Optional[str] = None
    tags: Optional[List[str]] = None
    template_data: Optional[dict] = None
    preview_image_url: Optional[str] = None
    is_free: Optional[bool] = None
    price_credits: Optional[int] = None


class TemplatePublish(BaseModel):
    version: str = "1.0.0"
    changelog: Optional[str] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    slug: str
    short_description: str
    long_description: Optional[str] = None
    category: TemplateCategory
    industry: Optional[str] = None
    tags: List[str] = []
    preview_image_url: Optional[str] = None
    author_name: str
    author_id: str
    organization_name: Optional[str] = None
    is_free: bool
    price_credits: int
    status: TemplateStatus
    is_featured: bool
    is_verified: bool
    usage_count: int
    view_count: int
    average_rating: float
    rating_count: int
    version: str
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TemplateDetailResponse(TemplateResponse):
    template_data: dict
    sample_output_url: Optional[str] = None
    changelog: Optional[str] = None
    is_favorited: bool = False
    user_review: Optional["ReviewResponse"] = None


class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TemplateSearchFilters(BaseModel):
    category: Optional[TemplateCategory] = None
    industry: Optional[str] = None
    tags: Optional[List[str]] = None
    is_free: Optional[bool] = None
    min_rating: Optional[float] = None
    is_featured: Optional[bool] = None
    sort_by: str = "popular"  # popular, newest, rating, usage


# Review Schemas
class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
    helpful_count: int
    is_verified_purchase: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewListResponse(BaseModel):
    reviews: List[ReviewResponse]
    total: int
    average_rating: float
    rating_distribution: dict  # {1: count, 2: count, ...}


# Collection Schemas
class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_public: bool = True


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    is_public: Optional[bool] = None


class CollectionResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    cover_image_url: Optional[str] = None
    curator_name: Optional[str] = None
    is_official: bool
    is_featured: bool
    template_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionDetailResponse(CollectionResponse):
    templates: List[TemplateResponse]


class CollectionListResponse(BaseModel):
    collections: List[CollectionResponse]
    total: int


# Download/Usage Schemas
class TemplateUseRequest(BaseModel):
    workshop_id: Optional[str] = None


class TemplateUseResponse(BaseModel):
    success: bool
    template_data: dict
    message: str


# Featured/Trending Response
class FeaturedTemplatesResponse(BaseModel):
    featured: List[TemplateResponse]
    trending: List[TemplateResponse]
    new_arrivals: List[TemplateResponse]
    top_rated: List[TemplateResponse]


# Industry Categories
class IndustryResponse(BaseModel):
    name: str
    slug: str
    template_count: int
    icon: Optional[str] = None


class IndustryListResponse(BaseModel):
    industries: List[IndustryResponse]


# User's Templates
class UserTemplatesResponse(BaseModel):
    published: List[TemplateResponse]
    drafts: List[TemplateResponse]
    favorites: List[TemplateResponse]
    downloads: List[TemplateResponse]


# Rebuild models to resolve forward references
TemplateDetailResponse.model_rebuild()
