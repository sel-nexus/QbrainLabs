from fastapi import APIRouter, HTTPException
from app.schemas.ai import EnhanceRequest, EnhanceResponse, FeasibilityRequest, FeasibilityResponse, DuplicateCheckRequest, DuplicateCheckResponse
from app.services.rag_service import rag_service
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.models import UseCase

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
