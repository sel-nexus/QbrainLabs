"""
Template Marketplace API Endpoints
Full marketplace functionality for discovering, publishing, and using templates
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import re
import math

from app.core.database import get_db
from app.models.models import User, Workshop
from app.models.marketplace import (
    MarketplaceTemplate, TemplateReview, TemplateDownload,
    TemplateFavorite, TemplateCollection, TemplateCollectionItem,
    TemplateStatus, TemplateCategory
)
from app.schemas.marketplace import (
    TemplateCreate, TemplateUpdate, TemplatePublish,
    TemplateResponse, TemplateDetailResponse, TemplateListResponse,
    ReviewCreate, ReviewUpdate, ReviewResponse, ReviewListResponse,
    CollectionCreate, CollectionUpdate, CollectionResponse, CollectionDetailResponse, CollectionListResponse,
    TemplateUseRequest, TemplateUseResponse,
    FeaturedTemplatesResponse, IndustryResponse, IndustryListResponse, UserTemplatesResponse
)
from app.api.auth import get_current_user
from app.middleware.error_handler import NotFoundException, ValidationException, ConflictException

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug"""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug[:150]


def template_to_response(template: MarketplaceTemplate, author: User = None) -> TemplateResponse:
    """Convert template model to response schema"""
    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        slug=template.slug,
        short_description=template.short_description,
        long_description=template.long_description,
        category=template.category,
        industry=template.industry,
        tags=template.tags or [],
        preview_image_url=template.preview_image_url,
        author_name=author.full_name or author.email if author else "Unknown",
        author_id=str(template.author_id),
        organization_name=None,
        is_free=template.is_free,
        price_credits=template.price_credits,
        status=template.status,
        is_featured=template.is_featured,
        is_verified=template.is_verified,
        usage_count=template.usage_count,
        view_count=template.view_count,
        average_rating=template.average_rating,
        rating_count=template.rating_count,
        version=template.version,
        created_at=template.created_at,
        published_at=template.published_at
    )


# ==================== Template Discovery ====================

@router.get("/featured", response_model=FeaturedTemplatesResponse)
async def get_featured_templates(
    db: AsyncSession = Depends(get_db)
):
    """Get featured, trending, new, and top-rated templates"""
    # Featured
    featured_result = await db.execute(
        select(MarketplaceTemplate)
        .options(selectinload(MarketplaceTemplate.author))
        .where(
            and_(
                MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
                MarketplaceTemplate.is_featured == True
            )
        )
        .order_by(desc(MarketplaceTemplate.usage_count))
        .limit(6)
    )
    featured = [template_to_response(t, t.author) for t in featured_result.scalars().all()]
    
    # Trending (most used in last 30 days)
    trending_result = await db.execute(
        select(MarketplaceTemplate)
        .options(selectinload(MarketplaceTemplate.author))
        .where(MarketplaceTemplate.status == TemplateStatus.PUBLISHED)
        .order_by(desc(MarketplaceTemplate.usage_count))
        .limit(6)
    )
    trending = [template_to_response(t, t.author) for t in trending_result.scalars().all()]
    
    # New arrivals
    new_result = await db.execute(
        select(MarketplaceTemplate)
        .options(selectinload(MarketplaceTemplate.author))
        .where(MarketplaceTemplate.status == TemplateStatus.PUBLISHED)
        .order_by(desc(MarketplaceTemplate.published_at))
        .limit(6)
    )
    new_arrivals = [template_to_response(t, t.author) for t in new_result.scalars().all()]
    
    # Top rated
    top_rated_result = await db.execute(
        select(MarketplaceTemplate)
        .options(selectinload(MarketplaceTemplate.author))
        .where(
            and_(
                MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
                MarketplaceTemplate.rating_count >= 3
            )
        )
        .order_by(desc(MarketplaceTemplate.rating_sum / func.nullif(MarketplaceTemplate.rating_count, 0)))
        .limit(6)
    )
    top_rated = [template_to_response(t, t.author) for t in top_rated_result.scalars().all()]
    
    return FeaturedTemplatesResponse(
        featured=featured,
        trending=trending,
        new_arrivals=new_arrivals,
        top_rated=top_rated
    )


@router.get("/search", response_model=TemplateListResponse)
async def search_templates(
    q: Optional[str] = None,
    category: Optional[str] = None,
    industry: Optional[str] = None,
    tags: Optional[str] = None,
    is_free: Optional[bool] = None,
    min_rating: Optional[float] = None,
    sort_by: str = "popular",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Search and filter templates"""
    query = select(MarketplaceTemplate).options(
        selectinload(MarketplaceTemplate.author)
    ).where(MarketplaceTemplate.status == TemplateStatus.PUBLISHED)
    
    # Text search
    if q:
        search_term = f"%{q}%"
        query = query.where(
            or_(
                MarketplaceTemplate.name.ilike(search_term),
                MarketplaceTemplate.short_description.ilike(search_term),
                MarketplaceTemplate.long_description.ilike(search_term)
            )
        )
    
    # Filters
    if category:
        query = query.where(MarketplaceTemplate.category == category)
    if industry:
        query = query.where(MarketplaceTemplate.industry == industry)
    if is_free is not None:
        query = query.where(MarketplaceTemplate.is_free == is_free)
    if min_rating is not None:
        query = query.where(
            (MarketplaceTemplate.rating_sum / func.nullif(MarketplaceTemplate.rating_count, 0)) >= min_rating
        )
    
    # Sorting
    if sort_by == "newest":
        query = query.order_by(desc(MarketplaceTemplate.published_at))
    elif sort_by == "rating":
        query = query.order_by(
            desc(MarketplaceTemplate.rating_sum / func.nullif(MarketplaceTemplate.rating_count, 0))
        )
    elif sort_by == "usage":
        query = query.order_by(desc(MarketplaceTemplate.usage_count))
    else:  # popular
        query = query.order_by(desc(MarketplaceTemplate.view_count))
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    templates = [template_to_response(t, t.author) for t in result.scalars().all()]
    
    return TemplateListResponse(
        templates=templates,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0
    )


@router.get("/industries", response_model=IndustryListResponse)
async def list_industries(
    db: AsyncSession = Depends(get_db)
):
    """List all industries with template counts"""
    result = await db.execute(
        select(
            MarketplaceTemplate.industry,
            func.count(MarketplaceTemplate.id)
        )
        .where(
            and_(
                MarketplaceTemplate.status == TemplateStatus.PUBLISHED,
                MarketplaceTemplate.industry.isnot(None)
            )
        )
        .group_by(MarketplaceTemplate.industry)
        .order_by(desc(func.count(MarketplaceTemplate.id)))
    )
    
    industries = [
        IndustryResponse(
            name=industry,
            slug=generate_slug(industry),
            template_count=count,
            icon=None
        )
        for industry, count in result.fetchall()
    ]
    
    return IndustryListResponse(industries=industries)


# ==================== Template CRUD ====================

@router.post("", response_model=TemplateResponse)
async def create_template(
    data: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new template"""
    slug = generate_slug(data.name)
    
    # Ensure unique slug
    base_slug = slug
    counter = 1
    while True:
        result = await db.execute(
            select(MarketplaceTemplate).where(MarketplaceTemplate.slug == slug)
        )
        if not result.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    template = MarketplaceTemplate(
        id=uuid.uuid4(),
        name=data.name,
        slug=slug,
        short_description=data.short_description,
        long_description=data.long_description,
        category=data.category.value,
        industry=data.industry,
        tags=data.tags,
        template_data=data.template_data,
        preview_image_url=data.preview_image_url,
        author_id=current_user.id,
        is_free=data.is_free,
        price_credits=data.price_credits,
        status=TemplateStatus.DRAFT
    )
    
    db.add(template)
    await db.commit()
    await db.refresh(template)
    
    return template_to_response(template, current_user)


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get template details"""
    result = await db.execute(
        select(MarketplaceTemplate)
        .options(selectinload(MarketplaceTemplate.author))
        .where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise NotFoundException("Template", template_id)
    
    # Check access for non-published templates
    if template.status != TemplateStatus.PUBLISHED:
        if str(template.author_id) != str(current_user.id) and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Template not accessible")
    
    # Increment view count
    template.view_count += 1
    await db.commit()
    
    # Check if favorited
    fav_result = await db.execute(
        select(TemplateFavorite).where(
            and_(
                TemplateFavorite.template_id == template_id,
                TemplateFavorite.user_id == current_user.id
            )
        )
    )
    is_favorited = fav_result.scalar_one_or_none() is not None
    
    # Get user's review
    review_result = await db.execute(
        select(TemplateReview).where(
            and_(
                TemplateReview.template_id == template_id,
                TemplateReview.user_id == current_user.id
            )
        )
    )
    user_review = review_result.scalar_one_or_none()
    
    base_response = template_to_response(template, template.author)
    
    return TemplateDetailResponse(
        **base_response.model_dump(),
        template_data=template.template_data,
        sample_output_url=template.sample_output_url,
        changelog=template.changelog,
        is_favorited=is_favorited,
        user_review=ReviewResponse(
            id=str(user_review.id),
            user_id=str(user_review.user_id),
            user_name=current_user.full_name or current_user.email,
            rating=user_review.rating,
            title=user_review.title,
            comment=user_review.comment,
            helpful_count=user_review.helpful_count,
            is_verified_purchase=user_review.is_verified_purchase,
            created_at=user_review.created_at
        ) if user_review else None
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    data: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a template"""
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise NotFoundException("Template", template_id)
    
    if str(template.author_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not the template author")
    
    # Update fields
    if data.name is not None:
        template.name = data.name
    if data.short_description is not None:
        template.short_description = data.short_description
    if data.long_description is not None:
        template.long_description = data.long_description
    if data.industry is not None:
        template.industry = data.industry
    if data.tags is not None:
        template.tags = data.tags
    if data.template_data is not None:
        template.template_data = data.template_data
    if data.preview_image_url is not None:
        template.preview_image_url = data.preview_image_url
    if data.is_free is not None:
        template.is_free = data.is_free
    if data.price_credits is not None:
        template.price_credits = data.price_credits
    
    template.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(template)
    
    return template_to_response(template, current_user)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a template"""
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise NotFoundException("Template", template_id)
    
    if str(template.author_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not the template author")
    
    await db.delete(template)
    await db.commit()
    
    return {"success": True, "message": "Template deleted"}


# ==================== Publishing ====================

@router.post("/{template_id}/publish", response_model=TemplateResponse)
async def publish_template(
    template_id: str,
    data: TemplatePublish,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publish a template to the marketplace"""
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise NotFoundException("Template", template_id)
    
    if str(template.author_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not the template author")
    
    if template.status == TemplateStatus.PUBLISHED:
        raise ValidationException("Template is already published")
    
    template.status = TemplateStatus.PUBLISHED
    template.version = data.version
    template.changelog = data.changelog
    template.published_at = datetime.utcnow()
    template.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(template)
    
    return template_to_response(template, current_user)


@router.post("/{template_id}/unpublish")
async def unpublish_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unpublish a template"""
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise NotFoundException("Template", template_id)
    
    if str(template.author_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not the template author")
    
    template.status = TemplateStatus.ARCHIVED
    template.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"success": True, "message": "Template unpublished"}


# ==================== Use Template ====================

@router.post("/{template_id}/use", response_model=TemplateUseResponse)
async def use_template(
    template_id: str,
    data: TemplateUseRequest = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Use/download a template"""
    result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise NotFoundException("Template", template_id)
    
    if template.status != TemplateStatus.PUBLISHED:
        if str(template.author_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Template not accessible")
    
    # Record download
    download = TemplateDownload(
        id=uuid.uuid4(),
        template_id=template.id,
        user_id=current_user.id,
        workshop_id=data.workshop_id if data else None
    )
    db.add(download)
    
    # Increment usage count
    template.usage_count += 1
    
    await db.commit()
    
    return TemplateUseResponse(
        success=True,
        template_data=template.template_data,
        message="Template ready to use"
    )


# ==================== Favorites ====================

@router.post("/{template_id}/favorite")
async def favorite_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add template to favorites"""
    # Check template exists
    template_result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    if not template_result.scalar_one_or_none():
        raise NotFoundException("Template", template_id)
    
    # Check if already favorited
    existing = await db.execute(
        select(TemplateFavorite).where(
            and_(
                TemplateFavorite.template_id == template_id,
                TemplateFavorite.user_id == current_user.id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Already favorited")
    
    favorite = TemplateFavorite(
        id=uuid.uuid4(),
        template_id=template_id,
        user_id=current_user.id
    )
    db.add(favorite)
    await db.commit()
    
    return {"success": True, "message": "Added to favorites"}


@router.delete("/{template_id}/favorite")
async def unfavorite_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove template from favorites"""
    result = await db.execute(
        select(TemplateFavorite).where(
            and_(
                TemplateFavorite.template_id == template_id,
                TemplateFavorite.user_id == current_user.id
            )
        )
    )
    favorite = result.scalar_one_or_none()
    
    if not favorite:
        raise NotFoundException("Favorite", template_id)
    
    await db.delete(favorite)
    await db.commit()
    
    return {"success": True, "message": "Removed from favorites"}


# ==================== Reviews ====================

@router.post("/{template_id}/reviews", response_model=ReviewResponse)
async def create_review(
    template_id: str,
    data: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a review for a template"""
    # Check template exists
    template_result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = template_result.scalar_one_or_none()
    if not template:
        raise NotFoundException("Template", template_id)
    
    # Check if already reviewed
    existing = await db.execute(
        select(TemplateReview).where(
            and_(
                TemplateReview.template_id == template_id,
                TemplateReview.user_id == current_user.id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Already reviewed this template")
    
    # Check if user has used the template
    download_check = await db.execute(
        select(TemplateDownload).where(
            and_(
                TemplateDownload.template_id == template_id,
                TemplateDownload.user_id == current_user.id
            )
        )
    )
    is_verified = download_check.scalar_one_or_none() is not None
    
    review = TemplateReview(
        id=uuid.uuid4(),
        template_id=template_id,
        user_id=current_user.id,
        rating=data.rating,
        title=data.title,
        comment=data.comment,
        is_verified_purchase=is_verified
    )
    db.add(review)
    
    # Update template rating
    template.rating_sum += data.rating
    template.rating_count += 1
    
    await db.commit()
    await db.refresh(review)
    
    return ReviewResponse(
        id=str(review.id),
        user_id=str(review.user_id),
        user_name=current_user.full_name or current_user.email,
        rating=review.rating,
        title=review.title,
        comment=review.comment,
        helpful_count=review.helpful_count,
        is_verified_purchase=review.is_verified_purchase,
        created_at=review.created_at
    )


@router.get("/{template_id}/reviews", response_model=ReviewListResponse)
async def list_reviews(
    template_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db)
):
    """List reviews for a template"""
    # Get template for rating info
    template_result = await db.execute(
        select(MarketplaceTemplate).where(MarketplaceTemplate.id == template_id)
    )
    template = template_result.scalar_one_or_none()
    if not template:
        raise NotFoundException("Template", template_id)
    
    # Get reviews
    offset = (page - 1) * page_size
    result = await db.execute(
        select(TemplateReview)
        .options(selectinload(TemplateReview.user))
        .where(TemplateReview.template_id == template_id)
        .order_by(desc(TemplateReview.created_at))
        .offset(offset)
        .limit(page_size)
    )
    reviews = result.scalars().all()
    
    # Count total
    count_result = await db.execute(
        select(func.count(TemplateReview.id)).where(TemplateReview.template_id == template_id)
    )
    total = count_result.scalar() or 0
    
    # Rating distribution
    dist_result = await db.execute(
        select(TemplateReview.rating, func.count(TemplateReview.id))
        .where(TemplateReview.template_id == template_id)
        .group_by(TemplateReview.rating)
    )
    distribution = {i: 0 for i in range(1, 6)}
    for rating, count in dist_result.fetchall():
        distribution[rating] = count
    
    review_responses = [
        ReviewResponse(
            id=str(r.id),
            user_id=str(r.user_id),
            user_name=r.user.full_name or r.user.email if r.user else "Unknown",
            rating=r.rating,
            title=r.title,
            comment=r.comment,
            helpful_count=r.helpful_count,
            is_verified_purchase=r.is_verified_purchase,
            created_at=r.created_at
        )
        for r in reviews
    ]
    
    return ReviewListResponse(
        reviews=review_responses,
        total=total,
        average_rating=template.average_rating,
        rating_distribution=distribution
    )


# ==================== Collections ====================

@router.get("/collections/featured", response_model=CollectionListResponse)
async def get_featured_collections(
    db: AsyncSession = Depends(get_db)
):
    """Get featured template collections"""
    result = await db.execute(
        select(TemplateCollection)
        .options(selectinload(TemplateCollection.curator), selectinload(TemplateCollection.items))
        .where(
            and_(
                TemplateCollection.is_public == True,
                TemplateCollection.is_featured == True
            )
        )
        .order_by(desc(TemplateCollection.created_at))
        .limit(10)
    )
    collections = result.scalars().all()
    
    return CollectionListResponse(
        collections=[
            CollectionResponse(
                id=str(c.id),
                name=c.name,
                slug=c.slug,
                description=c.description,
                cover_image_url=c.cover_image_url,
                curator_name=c.curator.full_name if c.curator else None,
                is_official=c.is_official,
                is_featured=c.is_featured,
                template_count=len(c.items) if c.items else 0,
                created_at=c.created_at
            )
            for c in collections
        ],
        total=len(collections)
    )


@router.get("/collections/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection(
    collection_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get collection details with templates"""
    result = await db.execute(
        select(TemplateCollection)
        .options(
            selectinload(TemplateCollection.curator),
            selectinload(TemplateCollection.items).selectinload(TemplateCollectionItem.template).selectinload(MarketplaceTemplate.author)
        )
        .where(TemplateCollection.id == collection_id)
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise NotFoundException("Collection", collection_id)
    
    templates = [
        template_to_response(item.template, item.template.author)
        for item in sorted(collection.items, key=lambda x: x.position)
        if item.template and item.template.status == TemplateStatus.PUBLISHED
    ]
    
    return CollectionDetailResponse(
        id=str(collection.id),
        name=collection.name,
        slug=collection.slug,
        description=collection.description,
        cover_image_url=collection.cover_image_url,
        curator_name=collection.curator.full_name if collection.curator else None,
        is_official=collection.is_official,
        is_featured=collection.is_featured,
        template_count=len(templates),
        created_at=collection.created_at,
        templates=templates
    )


# ==================== User's Templates ====================

@router.get("/me/templates", response_model=UserTemplatesResponse)
async def get_my_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's templates, favorites, and downloads"""
    # Published templates
    published_result = await db.execute(
        select(MarketplaceTemplate)
        .where(
            and_(
                MarketplaceTemplate.author_id == current_user.id,
                MarketplaceTemplate.status == TemplateStatus.PUBLISHED
            )
        )
        .order_by(desc(MarketplaceTemplate.created_at))
    )
    published = [template_to_response(t, current_user) for t in published_result.scalars().all()]
    
    # Draft templates
    drafts_result = await db.execute(
        select(MarketplaceTemplate)
        .where(
            and_(
                MarketplaceTemplate.author_id == current_user.id,
                MarketplaceTemplate.status == TemplateStatus.DRAFT
            )
        )
        .order_by(desc(MarketplaceTemplate.created_at))
    )
    drafts = [template_to_response(t, current_user) for t in drafts_result.scalars().all()]
    
    # Favorites
    favorites_result = await db.execute(
        select(TemplateFavorite)
        .options(selectinload(TemplateFavorite.template).selectinload(MarketplaceTemplate.author))
        .where(TemplateFavorite.user_id == current_user.id)
        .order_by(desc(TemplateFavorite.created_at))
    )
    favorites = [
        template_to_response(f.template, f.template.author)
        for f in favorites_result.scalars().all()
        if f.template
    ]
    
    # Downloads
    downloads_result = await db.execute(
        select(TemplateDownload)
        .options(selectinload(TemplateDownload.template).selectinload(MarketplaceTemplate.author))
        .where(TemplateDownload.user_id == current_user.id)
        .order_by(desc(TemplateDownload.downloaded_at))
    )
    downloads = [
        template_to_response(d.template, d.template.author)
        for d in downloads_result.scalars().all()
        if d.template
    ]
    
    return UserTemplatesResponse(
        published=published,
        drafts=drafts,
        favorites=favorites,
        downloads=downloads
    )
