from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.models.roi import ROICalculation
from app.models.models import UseCase, Workshop
from app.schemas.roi import (
    ROICalculationCreate, ROICalculationResponse,
    CostInputs, BenefitInputs, ROIParameters, ROIResults
)
from app.services.roi_service import ROIService
from app.models.models import User
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/roi", tags=["roi"])

@router.post("/calculate-only", response_model=ROIResults)
async def calculate_roi_only(
    costs: CostInputs,
    benefits: BenefitInputs,
    parameters: Optional[ROIParameters] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Perform ROI calculation without saving to database.
    Useful for 'What-If' scenarios.
    """
    if not parameters:
        parameters = ROIParameters()
    
    return ROIService.calculate_roi(costs, benefits, parameters)

@router.post("/workshops/{workshop_id}/usecases/{use_case_id}", response_model=ROICalculationResponse)
async def save_roi_calculation(
    workshop_id: UUID,
    use_case_id: UUID,
    data: ROICalculationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate and Save/Update ROI for a specific Use Case.
    """
    # Verify workshop and use case exist
    workshop = await db.get(Workshop, workshop_id)
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
        
    use_case = await db.get(UseCase, use_case_id)
    if not use_case:
        raise HTTPException(status_code=404, detail="Use Case not found")
        
    if use_case.workshop_id != workshop_id:
        raise HTTPException(status_code=400, detail="Use Case does not belong to Workshop")

    # Perform Calculation
    if not data.parameters:
        data.parameters = ROIParameters()
        
    results = ROIService.calculate_roi(data.costs, data.benefits, data.parameters)
    
    # Check if exists
    query = select(ROICalculation).where(ROICalculation.use_case_id == use_case_id)
    result = await db.execute(query)
    existing_roi = result.scalar_one_or_none()

    if existing_roi:
        existing_roi.costs = data.costs.model_dump()
        existing_roi.benefits = data.benefits.model_dump()
        existing_roi.parameters = data.parameters.model_dump()
        existing_roi.results = results.model_dump()
        roi_calc = existing_roi
    else:
        roi_calc = ROICalculation(
            use_case_id=use_case_id,
            workshop_id=workshop_id,
            costs=data.costs.model_dump(),
            benefits=data.benefits.model_dump(),
            parameters=data.parameters.model_dump(),
            results=results.model_dump()
        )
        db.add(roi_calc)
    
    await db.commit()
    await db.refresh(roi_calc)
    
    # Return response
    return ROICalculationResponse(
        id=roi_calc.id,
        use_case_id=roi_calc.use_case_id,
        workshop_id=roi_calc.workshop_id,
        costs=CostInputs(**roi_calc.costs),
        benefits=BenefitInputs(**roi_calc.benefits),
        parameters=ROIParameters(**roi_calc.parameters),
        results=ROIResults(**roi_calc.results),
        created_at=roi_calc.created_at,
        updated_at=roi_calc.updated_at
    )

@router.get("/workshops/{workshop_id}/usecases/{use_case_id}", response_model=ROICalculationResponse)
async def get_roi_calculation(
    workshop_id: UUID,
    use_case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get ROI calculation for a Use Case.
    """
    query = select(ROICalculation).where(ROICalculation.use_case_id == use_case_id)
    result = await db.execute(query)
    roi_calc = result.scalar_one_or_none()
    
    if not roi_calc:
        raise HTTPException(status_code=404, detail="ROI Calculation not found")
        
    if roi_calc.workshop_id != workshop_id:
        raise HTTPException(status_code=400, detail="ROI Calculation workshop mismatch")

    return ROICalculationResponse(
        id=roi_calc.id,
        use_case_id=roi_calc.use_case_id,
        workshop_id=roi_calc.workshop_id,
        costs=CostInputs(**roi_calc.costs),
        benefits=BenefitInputs(**roi_calc.benefits),
        parameters=ROIParameters(**roi_calc.parameters),
        results=ROIResults(**roi_calc.results),
        created_at=roi_calc.created_at,
        updated_at=roi_calc.updated_at
    )

@router.get("/workshops/{workshop_id}", response_model=List[ROICalculationResponse])
async def get_workshop_roi_calculations(
    workshop_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all ROI calculations for a workshop.
    """
    query = select(ROICalculation).where(ROICalculation.workshop_id == workshop_id)
    result = await db.execute(query)
    roi_calcs = result.scalars().all()
    
    return [
        ROICalculationResponse(
            id=roi.id,
            use_case_id=roi.use_case_id,
            workshop_id=roi.workshop_id,
            costs=CostInputs(**roi.costs),
            benefits=BenefitInputs(**roi.benefits),
            parameters=ROIParameters(**roi.parameters),
            results=ROIResults(**roi.results),
            created_at=roi.created_at,
            updated_at=roi.updated_at
        ) for roi in roi_calcs
    ]

from app.services.rag_service import rag_service
from app.schemas.roi import ROIEstimateRequest, ROIEstimatesResponse, BusinessCaseCreate, BusinessCaseResponse
from app.models.roi import BusinessCase

@router.post("/estimate", response_model=ROIEstimatesResponse)
async def estimate_roi_parameters(
    req: ROIEstimateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AI-assisted estimation of ROI parameters based on use case description.
    """
    use_case = await db.get(UseCase, req.use_case_id)
    if not use_case:
        raise HTTPException(status_code=404, detail="Use Case not found")

    # Call AI Service
    estimates = await rag_service.estimate_roi(
        use_case.title,
        use_case.description,
        req.industry,
        workshop_id=str(use_case.workshop_id),
        db=db
    )
    
    return ROIEstimatesResponse(**estimates)

@router.post("/business-case/generate", response_model=BusinessCaseResponse)
async def generate_business_case(
    req: BusinessCaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a full business case document/narrative using AI.
    """
    use_case = await db.get(UseCase, req.use_case_id)
    if not use_case:
        raise HTTPException(status_code=404, detail="Use Case not found")

    roi = await db.get(ROICalculation, req.roi_calculation_id)
    if not roi:
        raise HTTPException(status_code=404, detail="ROI Calculation not found")

    # Generate content via AI
    content = await rag_service.generate_business_case(
        use_case.__dict__,
        roi.results,
        workshop_id=str(use_case.workshop_id),
        db=db
    )
    
    # Save to database
    business_case = BusinessCase(
        use_case_id=req.use_case_id,
        roi_calculation_id=req.roi_calculation_id,
        content=content,
        template=req.template,
        status="generated",
        document_urls={"preview": "#"} # Placeholder
    )
    db.add(business_case)
    await db.commit()
    await db.refresh(business_case)
    
    return BusinessCaseResponse(
        id=business_case.id,
        use_case_id=business_case.use_case_id,
        status=business_case.status,
        document_urls=business_case.document_urls,
        created_at=business_case.created_at
    )
