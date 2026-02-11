from fastapi import APIRouter, HTTPException
from app.schemas.ai import (
    EnhanceRequest, EnhanceResponse, 
    FeasibilityRequest, FeasibilityResponse, 
    DuplicateCheckRequest, DuplicateCheckResponse,
    BusinessValueRequest, BusinessValueResponse,
    TechnicalAnalysisRequest, TechnicalAnalysisResponse
)
from app.services.rag_service import rag_service
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.database import get_db
from app.models.models import UseCase
from fastapi import UploadFile, File
from app.services.file_service import file_service
from typing import List, Dict, Any

router = APIRouter()

@router.post("/enhance", response_model=EnhanceResponse)
async def enhance_use_case(request: EnhanceRequest):
    try:
        result = await rag_service.enhance_use_case(request.text)
        # Normalize keys if LLM returns short ones
        return EnhanceResponse(
            refined_title=result.get("title") or result.get("refined_title"),
            refined_description=result.get("description") or result.get("refined_description"),
            suggested_solution=result.get("solution") or result.get("suggested_solution"),
            kpi=result.get("kpi"),
            is_mock=result.get("is_mock", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feasibility", response_model=FeasibilityResponse)
async def check_feasibility(request: FeasibilityRequest):
    try:
        result = await rag_service.check_feasibility(request.solution)
        return FeasibilityResponse(
            score=result.get("score", "Unknown"),
            reason=result.get("reason", "Analysis failed"),
            is_mock=result.get("is_mock", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/duplicates", response_model=DuplicateCheckResponse)
async def check_duplicates(
    request: DuplicateCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Fetch existing use cases for this workshop
        result = await db.execute(
            select(UseCase).where(UseCase.workshop_id == request.workshop_id)
        )
        use_cases = result.scalars().all()
        
        # Format for service: List[Dict]
        existing_items = [
            {"id": str(uc.id), "title": uc.title, "description": uc.description}
            for uc in use_cases
        ]
        
        result = await rag_service.check_duplicates(request.title, request.description, existing_items)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/business-value", response_model=BusinessValueResponse)
async def enhance_business_value(request: BusinessValueRequest):
    """
    Enhance the business value proposition with specific metrics, ROI indicators, and benchmarks.
    """
    try:
        result = await rag_service.enhance_business_value(
            title=request.title,
            description=request.description,
            category=request.category,
            current_kpi=request.current_kpi
        )
        return BusinessValueResponse(
            enhanced_kpi=result.get("enhanced_kpi", ""),
            specific_metrics=result.get("specific_metrics", []),
            roi_indicators=result.get("roi_indicators", []),
            benchmarks=result.get("benchmarks", []),
            business_impact=result.get("business_impact", ""),
            confidence_score=result.get("confidence_score", 0.0),
            is_mock=result.get("is_mock", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/technical-analysis", response_model=TechnicalAnalysisResponse)
async def analyze_technical_feasibility(request: TechnicalAnalysisRequest):
    """
    Generate deep-dive technical analysis including architecture, stack, and risks.
    """
    try:
        result = await rag_service.analyze_technical_feasibility(
            title=request.title,
            description=request.description,
            proposed_solution=request.proposed_solution
        )
        return TechnicalAnalysisResponse(
            architecture_overview=result.get("architecture_overview", ""),
            recommended_stack=result.get("recommended_stack", []),
            implementation_steps=result.get("implementation_steps", []),
            technical_risks=result.get("technical_risks", []),
            complexity_score=result.get("complexity_score", 5),
            is_mock=result.get("is_mock", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.schemas.ai import ROIRequest, ROIResponse, BusinessCaseRequest, BusinessCaseResponse

@router.post("/estimate-roi", response_model=ROIResponse)
async def estimate_roi(request: ROIRequest):
    """
    Estimate ROI parameters with cost drivers and benefit levers.
    """
    try:
        result = await rag_service.estimate_roi(
            use_case_title=request.title,
            use_case_desc=request.description,
            industry=request.industry
        )
        return ROIResponse(
            estimates=result.get("estimates", {}),
            cost_drivers=result.get("cost_drivers", []),
            benefit_levers=result.get("benefit_levers", []),
            assumptions=result.get("assumptions", []),
            is_mock=result.get("is_mock", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-business-case", response_model=BusinessCaseResponse)
async def generate_business_case(request: BusinessCaseRequest):
    """
    Generate a comprehensive business case narrative.
    """
    try:
        result = await rag_service.generate_business_case(
            use_case_data={
                "title": request.title,
                "description": request.description,
                "proposed_solution": request.proposed_solution
            },
            roi_results=request.roi_results
        )
        return BusinessCaseResponse(
            executive_summary=result.get("executive_summary", ""),
            problem_statement=result.get("problem_statement", ""),
            strategic_alignment=result.get("strategic_alignment", ""),
            financial_analysis=result.get("financial_analysis", ""),
            risks_and_mitigation=result.get("risks_and_mitigation", ""),
            recommendation=result.get("recommendation", ""),
            is_mock=result.get("is_mock", False)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-file", response_model=List[Dict[str, Any]])
async def analyze_file_content(file: UploadFile = File(...)):
    """
    Upload a file (DOCX, PPTX, PDF, MD, TXT) and extract potential challenge cards.
    """
    try:
        # 1. Extract text from file
        text = await file_service.extract_text_from_file(file)
        
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from file")
            
        # 2. Analyze using RAG/LLM
        challenges = await rag_service.analyze_document_context(text)
        
        return challenges
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
