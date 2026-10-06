"""
Subscription Tiers & Feature Flags API
US33: Database-Driven Configuration Management

Admin endpoints for managing subscription tiers and feature flags.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.middleware.admin_auth import require_admin
from app.models.models import User
from app.models.subscription import SubscriptionTier, FeatureFlag, FeatureFlagOverride
from app.models.organization import Organization

router = APIRouter(prefix="/api/admin", tags=["admin-subscription"])


# ============== Pydantic Schemas ==============

class SubscriptionTierResponse(BaseModel):
    id: str
    name: str
    display_name: str
    description: Optional[str]
    max_users: int
    max_workshops_per_month: int
    max_participants_per_workshop: int
    max_use_cases_per_workshop: int
    features: List[str]
    price_monthly: float
    price_yearly: float
    is_active: bool
    sort_order: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class SubscriptionTierCreate(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    max_users: int = 5
    max_workshops_per_month: int = 3
    max_participants_per_workshop: int = 25
    max_use_cases_per_workshop: int = 100
    features: List[str] = []
    price_monthly: float = 0
    price_yearly: float = 0
    sort_order: int = 0


class SubscriptionTierUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    max_users: Optional[int] = None
    max_workshops_per_month: Optional[int] = None
    max_participants_per_workshop: Optional[int] = None
    max_use_cases_per_workshop: Optional[int] = None
    features: Optional[List[str]] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class FeatureFlagResponse(BaseModel):
    id: str
    name: str
    display_name: Optional[str]
    description: Optional[str]
    default_enabled: bool
    is_active: bool
    created_at: Optional[datetime]
    override_count: int = 0

    class Config:
        from_attributes = True


class FeatureFlagCreate(BaseModel):
    name: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    default_enabled: bool = False


class FeatureFlagUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    default_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class FeatureFlagOverrideCreate(BaseModel):
    organization_id: str
    is_enabled: bool


class FeatureFlagOverrideResponse(BaseModel):
    id: str
    flag_id: str
    organization_id: str
    organization_name: Optional[str]
    is_enabled: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============== Subscription Tiers Endpoints ==============

@router.get("/tiers", response_model=List[SubscriptionTierResponse])
async def list_subscription_tiers(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all subscription tiers.
    Admin only.
    """
    result = await db.execute(
        select(SubscriptionTier).order_by(SubscriptionTier.sort_order)
    )
    tiers = result.scalars().all()
    
    return [
        SubscriptionTierResponse(
            id=str(tier.id),
            name=tier.name,
            display_name=tier.display_name,
            description=tier.description,
            max_users=tier.max_users,
            max_workshops_per_month=tier.max_workshops_per_month,
            max_participants_per_workshop=tier.max_participants_per_workshop,
            max_use_cases_per_workshop=tier.max_use_cases_per_workshop,
            features=tier.features or [],
            price_monthly=float(tier.price_monthly) if tier.price_monthly else 0,
            price_yearly=float(tier.price_yearly) if tier.price_yearly else 0,
            is_active=tier.is_active,
            sort_order=tier.sort_order,
            created_at=tier.created_at,
            updated_at=tier.updated_at
        )
        for tier in tiers
    ]


@router.post("/tiers", response_model=SubscriptionTierResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_tier(
    tier_data: SubscriptionTierCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new subscription tier.
    Admin only.
    """
    # Check if tier with same name exists
    result = await db.execute(
        select(SubscriptionTier).where(SubscriptionTier.name == tier_data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tier with name '{tier_data.name}' already exists"
        )
    
    tier = SubscriptionTier(**tier_data.model_dump())
    db.add(tier)
    await db.commit()
    await db.refresh(tier)
    
    return SubscriptionTierResponse(
        id=str(tier.id),
        name=tier.name,
        display_name=tier.display_name,
        description=tier.description,
        max_users=tier.max_users,
        max_workshops_per_month=tier.max_workshops_per_month,
        max_participants_per_workshop=tier.max_participants_per_workshop,
        max_use_cases_per_workshop=tier.max_use_cases_per_workshop,
        features=tier.features or [],
        price_monthly=float(tier.price_monthly) if tier.price_monthly else 0,
        price_yearly=float(tier.price_yearly) if tier.price_yearly else 0,
        is_active=tier.is_active,
        sort_order=tier.sort_order,
        created_at=tier.created_at,
        updated_at=tier.updated_at
    )


@router.put("/tiers/{tier_id}", response_model=SubscriptionTierResponse)
async def update_subscription_tier(
    tier_id: str,
    tier_update: SubscriptionTierUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a subscription tier.
    Admin only.
    """
    result = await db.execute(
        select(SubscriptionTier).where(SubscriptionTier.id == tier_id)
    )
    tier = result.scalar_one_or_none()
    
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription tier not found"
        )
    
    # Update fields
    update_data = tier_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tier, field, value)
    
    tier.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(tier)
    
    return SubscriptionTierResponse(
        id=str(tier.id),
        name=tier.name,
        display_name=tier.display_name,
        description=tier.description,
        max_users=tier.max_users,
        max_workshops_per_month=tier.max_workshops_per_month,
        max_participants_per_workshop=tier.max_participants_per_workshop,
        max_use_cases_per_workshop=tier.max_use_cases_per_workshop,
        features=tier.features or [],
        price_monthly=float(tier.price_monthly) if tier.price_monthly else 0,
        price_yearly=float(tier.price_yearly) if tier.price_yearly else 0,
        is_active=tier.is_active,
        sort_order=tier.sort_order,
        created_at=tier.created_at,
        updated_at=tier.updated_at
    )


@router.delete("/tiers/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_tier(
    tier_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete (soft delete) a subscription tier.
    Admin only.
    """
    result = await db.execute(
        select(SubscriptionTier).where(SubscriptionTier.id == tier_id)
    )
    tier = result.scalar_one_or_none()
    
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription tier not found"
        )
    
    # Soft delete
    tier.is_active = False
    await db.commit()
    
    return None


# ============== Feature Flags Endpoints ==============

@router.get("/feature-flags", response_model=List[FeatureFlagResponse])
async def list_feature_flags(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all feature flags with override counts.
    Admin only.
    """
    result = await db.execute(
        select(FeatureFlag).options(selectinload(FeatureFlag.overrides)).order_by(FeatureFlag.name)
    )
    flags = result.scalars().all()
    
    return [
        FeatureFlagResponse(
            id=str(flag.id),
            name=flag.name,
            display_name=flag.display_name,
            description=flag.description,
            default_enabled=flag.default_enabled,
            is_active=flag.is_active,
            created_at=flag.created_at,
            override_count=len(flag.overrides) if flag.overrides else 0
        )
        for flag in flags
    ]


@router.post("/feature-flags", response_model=FeatureFlagResponse, status_code=status.HTTP_201_CREATED)
async def create_feature_flag(
    flag_data: FeatureFlagCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new feature flag.
    Admin only.
    """
    # Check if flag exists
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.name == flag_data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Feature flag '{flag_data.name}' already exists"
        )
    
    flag = FeatureFlag(**flag_data.model_dump())
    db.add(flag)
    await db.commit()
    # Re-load with overrides; a lazy load here fails under async SQLAlchemy.
    result = await db.execute(
        select(FeatureFlag).options(selectinload(FeatureFlag.overrides)).where(FeatureFlag.id == flag.id)
    )
    flag = result.scalar_one()

    return FeatureFlagResponse(
        id=str(flag.id),
        name=flag.name,
        display_name=flag.display_name,
        description=flag.description,
        default_enabled=flag.default_enabled,
        is_active=flag.is_active,
        created_at=flag.created_at,
        override_count=0
    )


@router.put("/feature-flags/{flag_name}", response_model=FeatureFlagResponse)
async def update_feature_flag(
    flag_name: str,
    flag_update: FeatureFlagUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a feature flag.
    Admin only.
    """
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.name == flag_name)
    )
    flag = result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    # Update fields
    update_data = flag_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(flag, field, value)
    
    await db.commit()
    # Re-load with overrides; a lazy load here fails under async SQLAlchemy.
    result = await db.execute(
        select(FeatureFlag).options(selectinload(FeatureFlag.overrides)).where(FeatureFlag.id == flag.id)
    )
    flag = result.scalar_one()

    return FeatureFlagResponse(
        id=str(flag.id),
        name=flag.name,
        display_name=flag.display_name,
        description=flag.description,
        default_enabled=flag.default_enabled,
        is_active=flag.is_active,
        created_at=flag.created_at,
        override_count=len(flag.overrides) if flag.overrides else 0
    )


@router.get("/feature-flags/{flag_name}/overrides", response_model=List[FeatureFlagOverrideResponse])
async def list_feature_flag_overrides(
    flag_name: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all overrides for a feature flag.
    Admin only.
    """
    result = await db.execute(
        select(FeatureFlag)
        .options(selectinload(FeatureFlag.overrides).selectinload(FeatureFlagOverride.organization))
        .where(FeatureFlag.name == flag_name)
    )
    flag = result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    return [
        FeatureFlagOverrideResponse(
            id=str(override.id),
            flag_id=str(override.flag_id),
            organization_id=str(override.organization_id),
            organization_name=override.organization.name if override.organization else None,
            is_enabled=override.is_enabled,
            created_at=override.created_at
        )
        for override in flag.overrides
    ]


@router.post("/feature-flags/{flag_name}/override", response_model=FeatureFlagOverrideResponse)
async def create_feature_flag_override(
    flag_name: str,
    override_data: FeatureFlagOverrideCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create or update an organization-specific feature flag override.
    Admin only.
    """
    # Get flag
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.name == flag_name)
    )
    flag = result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    # Check if organization exists
    org_result = await db.execute(
        select(Organization).where(Organization.id == override_data.organization_id)
    )
    organization = org_result.scalar_one_or_none()
    
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    # Check if override exists
    override_result = await db.execute(
        select(FeatureFlagOverride).where(
            FeatureFlagOverride.flag_id == flag.id,
            FeatureFlagOverride.organization_id == override_data.organization_id
        )
    )
    override = override_result.scalar_one_or_none()
    
    if override:
        # Update existing override
        override.is_enabled = override_data.is_enabled
    else:
        # Create new override
        override = FeatureFlagOverride(
            flag_id=flag.id,
            organization_id=override_data.organization_id,
            is_enabled=override_data.is_enabled,
            created_by=admin.id
        )
        db.add(override)
    
    await db.commit()
    await db.refresh(override)
    
    return FeatureFlagOverrideResponse(
        id=str(override.id),
        flag_id=str(override.flag_id),
        organization_id=str(override.organization_id),
        organization_name=organization.name,
        is_enabled=override.is_enabled,
        created_at=override.created_at
    )


@router.delete("/feature-flags/{flag_name}/override/{organization_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature_flag_override(
    flag_name: str,
    organization_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a feature flag override for an organization.
    Admin only.
    """
    # Get flag
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.name == flag_name)
    )
    flag = result.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found"
        )
    
    # Get override
    override_result = await db.execute(
        select(FeatureFlagOverride).where(
            FeatureFlagOverride.flag_id == flag.id,
            FeatureFlagOverride.organization_id == organization_id
        )
    )
    override = override_result.scalar_one_or_none()
    
    if not override:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Override not found"
        )
    
    await db.delete(override)
    await db.commit()
    
    return None
