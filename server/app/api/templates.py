"""
Workshop Templates API (US22)
Endpoints for browsing, previewing, and using workshop templates, industry packages, and use case libraries
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models import User
from app.models.templates import (
    WorkshopTemplate,
    IndustryPackage,
    UseCaseLibrary,
    CriteriaTemplate
)
from app.api.auth import get_current_user

router = APIRouter()


# ==================== Schemas ====================

class WorkshopTemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    industry: Optional[str]
    description: Optional[str]
    config: dict
    phases: Optional[dict]
    criteria: dict
    agenda: Optional[str]
    facilitator_guide: Optional[str]
    participant_materials: Optional[dict]
    sample_use_cases: Optional[dict]
    is_public: bool
    author_id: str
    usage_count: int
    rating: float
    rating_count: int
    created_at: str

    class Config:
        from_attributes = True


class IndustryPackageResponse(BaseModel):
    id: str
    industry: str
    use_cases: dict
    criteria: dict
    benchmarks: Optional[dict]
    regulatory_considerations: Optional[str]
    case_studies: Optional[dict]
    description: Optional[str]
    use_case_count: int
    template_count: int

    class Config:
        from_attributes = True


class UseCaseLibraryResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    industry: Optional[str]
    ai_technology: Optional[str]
    complexity: Optional[str]
    kpis: Optional[dict]
    target_user: Optional[str]
    proposed_solution: Optional[str]
    tags: List[str]
    similar_use_cases: Optional[dict]
    import_count: int

    class Config:
        from_attributes = True


class CriteriaTemplateResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    category: str
    criteria: dict
    usage_count: int

    class Config:
        from_attributes = True


class UseTemplateRequest(BaseModel):
    workshop_title: Optional[str] = None
    customize: bool = True


# ==================== Workshop Templates ====================

@router.get("/workshop-templates", response_model=List[WorkshopTemplateResponse])
async def list_workshop_templates(
    category: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    is_public: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List available workshop templates with optional filtering."""
    query = select(WorkshopTemplate)
    
    # Filter by visibility: show public templates or user's own templates
    if current_user:
        query = query.where(
            or_(
                WorkshopTemplate.is_public == True,
                WorkshopTemplate.author_id == current_user.id
            )
        )
    else:
        query = query.where(WorkshopTemplate.is_public == True)
    
    if category:
        query = query.where(WorkshopTemplate.category == category)
    if industry:
        query = query.where(WorkshopTemplate.industry == industry)
    if is_public is not None:
        query = query.where(WorkshopTemplate.is_public == is_public)
    
    query = query.order_by(WorkshopTemplate.usage_count.desc(), WorkshopTemplate.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/workshop-templates/{template_id}", response_model=WorkshopTemplateResponse)
async def get_workshop_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get a specific workshop template by ID."""
    result = await db.execute(
        select(WorkshopTemplate).where(WorkshopTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check visibility
    if not template.is_public and (not current_user or template.author_id != current_user.id):
        raise HTTPException(status_code=403, detail="Template not accessible")
    
    return template


@router.post("/workshop-templates/{template_id}/use")
async def use_workshop_template(
    template_id: str,
    request: UseTemplateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Use a template to create a new workshop. Returns template data for workshop creation."""
    result = await db.execute(
        select(WorkshopTemplate).where(WorkshopTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check visibility
    if not template.is_public and template.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Template not accessible")
    
    # Increment usage count
    template.usage_count += 1
    await db.commit()
    
    return {
        "template_id": str(template.id),
        "template_name": template.name,
        "workshop_title": request.workshop_title or template.name,
        "config": template.config,
        "criteria": template.criteria,
        "phases": template.phases,
        "sample_use_cases": template.sample_use_cases,
        "customize": request.customize
    }


# ==================== Industry Packages ====================

@router.get("/industry-packages", response_model=List[IndustryPackageResponse])
async def list_industry_packages(
    db: AsyncSession = Depends(get_db)
):
    """List all available industry packages."""
    result = await db.execute(
        select(IndustryPackage).order_by(IndustryPackage.industry)
    )
    return result.scalars().all()


@router.get("/industry-packages/{industry}", response_model=IndustryPackageResponse)
async def get_industry_package(
    industry: str,
    db: AsyncSession = Depends(get_db)
):
    """Get industry package by industry name."""
    result = await db.execute(
        select(IndustryPackage).where(IndustryPackage.industry == industry)
    )
    package = result.scalar_one_or_none()
    
    if not package:
        raise HTTPException(status_code=404, detail="Industry package not found")
    
    return package


@router.get("/industry-packages/{industry}/use-cases", response_model=List[UseCaseLibraryResponse])
async def get_industry_use_cases(
    industry: str,
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get use cases for a specific industry."""
    query = select(UseCaseLibrary).where(UseCaseLibrary.industry == industry)
    
    if category:
        query = query.where(UseCaseLibrary.category == category)
    
    query = query.order_by(UseCaseLibrary.import_count.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


# ==================== Use Case Library ====================

@router.get("/use-case-library", response_model=List[UseCaseLibraryResponse])
async def list_use_case_library(
    category: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    complexity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List use cases from the library with filtering."""
    query = select(UseCaseLibrary)
    
    if category:
        query = query.where(UseCaseLibrary.category == category)
    if industry:
        query = query.where(UseCaseLibrary.industry == industry)
    if complexity:
        query = query.where(UseCaseLibrary.complexity == complexity)
    if search:
        query = query.where(
            or_(
                UseCaseLibrary.title.ilike(f"%{search}%"),
                UseCaseLibrary.description.ilike(f"%{search}%")
            )
        )
    
    query = query.order_by(UseCaseLibrary.import_count.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/use-case-library/{case_id}/import")
async def import_use_case(
    case_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Import a use case from the library. Returns use case data for adding to workshop."""
    result = await db.execute(
        select(UseCaseLibrary).where(UseCaseLibrary.id == case_id)
    )
    use_case = result.scalar_one_or_none()
    
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Increment import count
    use_case.import_count += 1
    await db.commit()
    
    return {
        "use_case_id": str(use_case.id),
        "title": use_case.title,
        "description": use_case.description,
        "kpi": use_case.kpis.get("primary") if use_case.kpis else None,
        "category": use_case.category,
        "target_user": use_case.target_user,
        "proposed_solution": use_case.proposed_solution,
        "industry": use_case.industry,
        "complexity": use_case.complexity
    }


# ==================== Criteria Templates ====================

@router.get("/criteria-templates", response_model=List[CriteriaTemplateResponse])
async def list_criteria_templates(
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """List available criteria templates."""
    query = select(CriteriaTemplate)
    
    if category:
        query = query.where(CriteriaTemplate.category == category)
    
    query = query.order_by(CriteriaTemplate.usage_count.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/criteria-templates/{template_id}", response_model=CriteriaTemplateResponse)
async def get_criteria_template(
    template_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific criteria template."""
    result = await db.execute(
        select(CriteriaTemplate).where(CriteriaTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Criteria template not found")
    
    return template
