"""
Knowledge Base API endpoints
Provides AI use case library and insights for admin and facilitators
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
import json
import difflib
import uuid

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, Workshop, UseCase, Vote
from app.schemas.knowledge_base import (
    KnowledgeBaseOverview,
    UseCaseTemplate,
    Industry,
    Category,
    Technology,
    UseCaseSearchResult,
    WorkshopInsight,
    UseCaseAnalysis,
    UseCaseTemplate
)
from app.services.rag_service import rag_service
from pydantic import BaseModel

class RefreshRequest(BaseModel):
    provider: str = "perplexity"  # or "google"
    industry_id: Optional[str] = None
    query: Optional[str] = None
    custom_scope: Optional[str] = None  # User-provided custom search scope


class AddUseCaseRequest(BaseModel):
    title: str
    description: str
    industry_id: str
    category: str
    complexity: str = "Medium"
    typical_roi: str = "TBD"
    implementation_time: str = "3-6 months"
    technologies: List[str] = []


class MoveUseCaseRequest(BaseModel):
    usecase_id: str
    target_industry_id: str
    create_industry: bool = True  # Create industry if it doesn't exist


class DeleteUseCaseRequest(BaseModel):
    usecase_id: str


router = APIRouter(prefix="/api/knowledge-base", tags=["knowledge-base"])


from pathlib import Path

# Define absolute path to knowledge base file
KB_FILE_PATH = Path(__file__).parent.parent / "data" / "knowledge_base.json"

# Load knowledge base data
def load_knowledge_base():
    try:
        if not KB_FILE_PATH.exists():
            print(f"Knowledge base file not found at: {KB_FILE_PATH}")
            return {"industries": [], "categories": [], "technologies": []}
            
        with open(KB_FILE_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading knowledge base from {KB_FILE_PATH}: {e}")
        return {"industries": [], "categories": [], "technologies": []}

KB_DATA = load_knowledge_base()


def _industries_for_user(industries_data: list, user: User) -> list:
    """
    For admins: return all industries with all use cases.
    For facilitators: return only industries that have at least one use case created by this user,
    and only include those use cases (created_by == user.id).
    Use cases without created_by are treated as system/admin-only (facilitators don't see them).
    """
    if getattr(user, "is_admin_user", None):
        return list(industries_data) if industries_data else []

    user_id = str(user.id)
    out = []
    for ind in industries_data or []:
        use_cases = ind.get("use_cases") or []
        filtered_ucs = [uc for uc in use_cases if uc.get("created_by") == user_id]
        if not filtered_ucs:
            continue
        out.append({
            **ind,
            "use_cases": filtered_ucs,
        })
    return out


# Save knowledge base data
def save_knowledge_base(data):
    try:
        # Ensure directory exists
        KB_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        
        with open(KB_FILE_PATH, "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving knowledge base to {KB_FILE_PATH}: {e}")
        return False


@router.get("/overview", response_model=KnowledgeBaseOverview)
async def get_knowledge_base_overview(
    current_user: User = Depends(get_current_user)
):
    """
    Get overview of the AI Knowledge Base.
    Admins see all use cases; facilitators see only use cases they created.
    """
    global KB_DATA
    KB_DATA = load_knowledge_base()
    industries_filtered = _industries_for_user(KB_DATA.get("industries", []), current_user)
    total_use_cases = sum(len(ind.get("use_cases", [])) for ind in industries_filtered)
    industries_summary = [
        {
            "id": ind["id"],
            "name": ind["name"],
            "icon": ind.get("icon", "building"),
            "use_case_count": len(ind.get("use_cases", []))
        }
        for ind in industries_filtered
    ]
    # Categories/technologies: admins see global lists; facilitators see unique from their use cases only
    if getattr(current_user, "is_admin_user", None):
        all_cats = set(KB_DATA.get("categories", []))
        all_techs = set(KB_DATA.get("technologies", []))
    else:
        all_cats = set()
        all_techs = set()
        for ind in industries_filtered:
            for uc in ind.get("use_cases", []):
                if uc.get("category"):
                    all_cats.add(uc["category"])
                for t in uc.get("technologies") or []:
                    all_techs.add(t)
    return KnowledgeBaseOverview(
        total_industries=len(industries_filtered),
        total_use_cases=total_use_cases,
        total_categories=len(all_cats),
        total_technologies=len(all_techs),
        industries=industries_summary
    )


@router.get("/industries", response_model=List[Industry])
async def get_industries(
    current_user: User = Depends(get_current_user)
):
    """
    Get all industries with their use case templates.
    Admins see all; facilitators see only industries that contain use cases they created.
    """
    global KB_DATA
    KB_DATA = load_knowledge_base()
    industries_filtered = _industries_for_user(KB_DATA.get("industries", []), current_user)
    return [Industry(**ind) for ind in industries_filtered]


@router.get("/industries/{industry_id}", response_model=Industry)
async def get_industry(
    industry_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific industry with its use cases.
    Admins see all use cases; facilitators see only use cases they created.
    """
    global KB_DATA
    KB_DATA = load_knowledge_base()
    industries_filtered = _industries_for_user(KB_DATA.get("industries", []), current_user)
    for ind in industries_filtered:
        if ind["id"] == industry_id:
            return Industry(**ind)
    raise HTTPException(status_code=404, detail="Industry not found")


@router.get("/categories", response_model=List[Category])
async def get_categories(
    current_user: User = Depends(get_current_user)
):
    """
    Get all AI use case categories
    """
    return [Category(**cat) for cat in KB_DATA.get("categories", [])]


@router.get("/technologies", response_model=List[Technology])
async def get_technologies(
    current_user: User = Depends(get_current_user)
):
    """
    Get all AI technologies
    """
    return [Technology(**tech) for tech in KB_DATA.get("technologies", [])]


@router.get("/search", response_model=List[UseCaseSearchResult])
async def search_use_cases(
    query: str = Query(..., min_length=2, description="Search query"),
    industry: Optional[str] = Query(None, description="Filter by industry ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    complexity: Optional[str] = Query(None, description="Filter by complexity"),
    current_user: User = Depends(get_current_user)
):
    """
    Search the knowledge base for relevant use case templates.
    Admins search all; facilitators search only within use cases they created.
    Uses fuzzy matching for relevance scoring.
    """
    global KB_DATA
    KB_DATA = load_knowledge_base()
    industries_filtered = _industries_for_user(KB_DATA.get("industries", []), current_user)
    results = []
    query_lower = query.lower()

    for ind in industries_filtered:
        if industry and ind["id"] != industry:
            continue
        for uc in ind.get("use_cases", []):
            if category and (uc.get("category") or "").lower() != category.lower():
                continue
            if complexity and (uc.get("complexity") or "").lower() != complexity.lower():
                continue
            title_score = difflib.SequenceMatcher(None, query_lower, (uc.get("title") or "").lower()).ratio()
            desc_score = difflib.SequenceMatcher(None, query_lower, (uc.get("description") or "").lower()).ratio()
            cat_score = difflib.SequenceMatcher(None, query_lower, (uc.get("category") or "").lower()).ratio()
            relevance = (title_score * 0.5) + (desc_score * 0.3) + (cat_score * 0.2)
            if query_lower in (uc.get("title") or "").lower() or query_lower in (uc.get("description") or "").lower():
                relevance = max(relevance, 0.8)
            if relevance > 0.2:
                results.append(UseCaseSearchResult(
                    id=uc["id"],
                    title=uc["title"],
                    description=uc["description"],
                    industry=ind["id"],
                    industry_name=ind["name"],
                    category=uc.get("category", ""),
                    complexity=uc.get("complexity", "Medium"),
                    typical_roi=uc.get("typical_roi", "TBD"),
                    relevance_score=round(relevance, 2)
                ))
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    return results[:20]


@router.post("/refresh", response_model=List[UseCaseSearchResult])
async def refresh_use_cases(
    request: RefreshRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Refresh use cases from public research.
    US26 Enhancement: Supports custom scope and filters results against knowledge base.
    Returns only new or refinable use cases.
    """
    global KB_DATA
    results = []
    
    # Determine industry name
    industry_name = "General"
    if request.industry_id:
        for ind in KB_DATA.get("industries", []):
            if ind["id"] == request.industry_id:
                industry_name = ind["name"]
                break
    
    # Call RAG service to get trending use cases with custom scope
    fresh_use_cases = await rag_service.find_trending_use_cases(
        industry=industry_name,
        count=5,  # Get more results since we'll filter
        custom_scope=request.custom_scope
    )
    
    # Build list of existing use cases for comparison (facilitators: only their own)
    KB_DATA = load_knowledge_base()
    industries_for_refresh = _industries_for_user(KB_DATA.get("industries", []), current_user)
    existing_use_cases = []
    for ind in industries_for_refresh:
        for uc in ind.get("use_cases", []):
            existing_use_cases.append({
                "id": uc["id"],
                "title": uc["title"],
                "description": uc["description"],
                "industry_id": ind["id"]
            })
    
    # Filter and categorize each research result
    for item in fresh_use_cases:
        # Set industry information properly
        if request.industry_id:
            # If user selected a specific industry, use that
            item["industry"] = request.industry_id
            item["industry_name"] = industry_name
        else:
            # Otherwise, use the industry name from the RAG service result
            # This will be used to create a new industry if it doesn't exist
            item["industry"] = item.get("industry_name", item.get("industry", "General"))
            item["industry_name"] = item.get("industry_name", item.get("industry", "General"))
        
        # Find best match in existing use cases
        best_match = None
        best_similarity = 0.0
        
        for existing in existing_use_cases:
            # Calculate similarity using title and description
            title_similarity = difflib.SequenceMatcher(
                None, 
                item["title"].lower(), 
                existing["title"].lower()
            ).ratio()
            
            desc_similarity = difflib.SequenceMatcher(
                None,
                item["description"].lower(),
                existing["description"].lower()
            ).ratio()
            
            # Weighted average (title is more important)
            similarity = (title_similarity * 0.6) + (desc_similarity * 0.4)
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = existing
        
        # Categorize based on similarity threshold
        if best_similarity > 0.85:
            # Too similar - skip (duplicate)
            continue
        elif best_similarity >= 0.6:
            # Refinable - can enhance existing use case
            item["is_new"] = False
            item["is_refinable"] = True
            item["existing_usecase_id"] = best_match["id"]
            
            # Generate refinement suggestions
            refinement_parts = []
            
            # Check if new description has additional info
            new_desc = item["description"].lower()
            existing_desc = best_match["description"].lower()
            
            if len(new_desc) > len(existing_desc) * 1.2:
                refinement_parts.append("Enhanced description with additional details")
            
            # Check for ROI differences
            if item.get("typical_roi") and item["typical_roi"] != "30-50% Efficiency Gain":
                refinement_parts.append(f"Updated ROI estimate: {item['typical_roi']}")
            
            # Check for category/complexity differences
            if item.get("category"):
                refinement_parts.append(f"Category refinement: {item['category']}")
            
            if refinement_parts:
                item["refinement_suggestions"] = "; ".join(refinement_parts)
            else:
                item["refinement_suggestions"] = "Additional context and updated information from latest research"
        else:
            # New use case
            item["is_new"] = True
            item["is_refinable"] = False
        
        results.append(UseCaseSearchResult(**item))
    
    return results


@router.post("/add", response_model=UseCaseSearchResult)
async def add_use_case(
    request: AddUseCaseRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Add a new use case to the knowledge base library.
    Creates a new industry category if it doesn't exist.
    """
    # Reload data to ensure we have latest
    global KB_DATA
    KB_DATA = load_knowledge_base()
    
    # Initialize industries list if not present
    if "industries" not in KB_DATA:
        KB_DATA["industries"] = []
    
    # Find industry and validate
    industry_found = False
    industry_name = request.industry_id
    target_industry_id = request.industry_id
    
    # First, try to find the exact industry by ID
    for ind in KB_DATA.get("industries", []):
        if ind["id"] == request.industry_id:
            industry_found = True
            industry_name = ind["name"]
            break
    
    # If not found, try to find by name (case-insensitive)
    if not industry_found:
        for ind in KB_DATA.get("industries", []):
            if ind["name"].lower() == request.industry_id.lower():
                industry_found = True
                industry_name = ind["name"]
                target_industry_id = ind["id"]
                break
    
    # If still not found, create a new industry
    if not industry_found:
        # Generate industry ID from name
        target_industry_id = request.industry_id.lower().replace(" ", "-").replace("_", "-")
        industry_name = request.industry_id
        
        # Create new industry object
        new_industry = {
            "id": target_industry_id,
            "name": industry_name,
            "icon": "brain",  # Default icon
            "use_cases": []
        }
        
        KB_DATA["industries"].append(new_industry)
        print(f"[KB] Created new industry: {industry_name} (ID: {target_industry_id})")
    
    # Create new use case object (created_by so facilitators only see their own in Knowledge Base)
    new_id = f"{target_industry_id}-{uuid.uuid4().hex[:6]}"
    new_use_case = {
        "id": new_id,
        "title": request.title,
        "description": request.description,
        "category": request.category,
        "complexity": request.complexity,
        "data_requirements": "To be defined",
        "typical_roi": request.typical_roi,
        "implementation_time": request.implementation_time,
        "technologies": request.technologies,
        "kpis": [],
        "created_by": str(current_user.id),
    }
    
    # Add use case to the industry
    for ind in KB_DATA.get("industries", []):
        if ind["id"] == target_industry_id:
            ind["use_cases"].append(new_use_case)
            break
        
    # Save back to file
    if not save_knowledge_base(KB_DATA):
        raise HTTPException(status_code=500, detail="Failed to save knowledge base")
        
    return UseCaseSearchResult(
        id=new_id,
        title=new_use_case["title"],
        description=new_use_case["description"],
        industry=target_industry_id,
        industry_name=industry_name,
        category=new_use_case["category"],
        complexity=new_use_case["complexity"],
        typical_roi=new_use_case["typical_roi"],
        relevance_score=1.0
    )


@router.post("/move")
async def move_use_case(
    request: MoveUseCaseRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Move a use case from one industry to another.
    Creates the target industry if it doesn't exist and create_industry is True.
    Only accessible to admin users.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can move use cases")
    
    # Reload data
    global KB_DATA
    KB_DATA = load_knowledge_base()
    
    if "industries" not in KB_DATA:
        raise HTTPException(status_code=500, detail="Knowledge base not properly initialized")
    
    # Find the use case in the current industry
    source_industry = None
    use_case_to_move = None
    
    for ind in KB_DATA["industries"]:
        for uc in ind.get("use_cases", []):
            if uc["id"] == request.usecase_id:
                source_industry = ind
                use_case_to_move = uc
                break
        if use_case_to_move:
            break
    
    if not use_case_to_move:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Find or create target industry
    target_industry = None
    for ind in KB_DATA["industries"]:
        if ind["id"] == request.target_industry_id or ind["name"].lower() == request.target_industry_id.lower():
            target_industry = ind
            break
    
    if not target_industry:
        if request.create_industry:
            # Create new industry
            target_industry_id = request.target_industry_id.lower().replace(" ", "-").replace("_", "-")
            target_industry = {
                "id": target_industry_id,
                "name": request.target_industry_id,
                "icon": "brain",
                "use_cases": []
            }
            KB_DATA["industries"].append(target_industry)
            print(f"[KB] Created new industry for move: {request.target_industry_id} (ID: {target_industry_id})")
        else:
            raise HTTPException(status_code=404, detail="Target industry not found")
    
    # Move the use case
    source_industry["use_cases"].remove(use_case_to_move)
    target_industry["use_cases"].append(use_case_to_move)
    
    # Save changes
    if not save_knowledge_base(KB_DATA):
        raise HTTPException(status_code=500, detail="Failed to save knowledge base")
    
    return {
        "success": True,
        "message": f"Use case '{use_case_to_move['title']}' moved to {target_industry['name']}",
        "usecase_id": request.usecase_id,
        "source_industry": source_industry["name"],
        "target_industry": target_industry["name"]
    }


@router.delete("/usecases/{usecase_id}")
async def delete_use_case(
    usecase_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a use case from the knowledge base.
    Only accessible to admin users.
    """
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can delete use cases")
    
    # Reload data
    global KB_DATA
    KB_DATA = load_knowledge_base()
    
    if "industries" not in KB_DATA:
        raise HTTPException(status_code=500, detail="Knowledge base not properly initialized")
    
    # Find and delete the use case
    deleted = False
    deleted_title = None
    deleted_industry = None
    
    for ind in KB_DATA["industries"]:
        for uc in ind.get("use_cases", []):
            if uc["id"] == usecase_id:
                deleted_title = uc["title"]
                deleted_industry = ind["name"]
                ind["use_cases"].remove(uc)
                deleted = True
                break
        if deleted:
            break
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Save changes
    if not save_knowledge_base(KB_DATA):
        raise HTTPException(status_code=500, detail="Failed to save knowledge base")
    
    print(f"[KB] Deleted use case: {deleted_title} from {deleted_industry}")
    
    return {
        "success": True,
        "message": f"Use case '{deleted_title}' deleted successfully",
        "usecase_id": usecase_id,
        "industry": deleted_industry
    }


@router.get("/workshop/{workshop_id}/insights", response_model=WorkshopInsight)
async def get_workshop_insights(
    workshop_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get AI-powered insights for a specific workshop
    Analyzes submitted use cases and provides recommendations
    Only accessible to workshop facilitator or admin
    """
    # Get workshop
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Check access: must be facilitator or admin
    if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get use cases for this workshop
    use_cases_result = await db.execute(
        select(UseCase).where(UseCase.workshop_id == workshop_id)
    )
    use_cases = use_cases_result.scalars().all()
    
    # Analyze categories and complexity
    categories_dist = {}
    complexity_dist = {"Low": 0, "Medium": 0, "High": 0}
    
    for uc in use_cases:
        # Try to match with knowledge base categories
        matched_category = _match_category(uc.title, uc.description)
        categories_dist[matched_category] = categories_dist.get(matched_category, 0) + 1
        
        # Estimate complexity
        estimated_complexity = _estimate_complexity(uc.description)
        complexity_dist[estimated_complexity] += 1
    
    # Get recommended templates based on use cases
    recommended = _get_recommendations(use_cases)
    
    # Generate AI summary
    ai_summary = _generate_workshop_summary(workshop.title, use_cases, categories_dist)
    
    return WorkshopInsight(
        workshop_id=str(workshop.id),
        workshop_title=workshop.title,
        total_use_cases=len(use_cases),
        categories_distribution=categories_dist,
        complexity_distribution=complexity_dist,
        recommended_templates=recommended,
        ai_summary=ai_summary
    )


@router.get("/analyze/{use_case_id}", response_model=UseCaseAnalysis)
async def analyze_use_case(
    use_case_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deep analysis of a specific use case against the knowledge base
    Provides matched templates, feasibility, and recommendations
    """
    # Get use case
    result = await db.execute(select(UseCase).where(UseCase.id == use_case_id))
    use_case = result.scalars().first()
    
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")
    
    # Get workshop to check access
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == use_case.workshop_id))
    workshop = workshop_result.scalars().first()
    
    if workshop and str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find matching templates
    matched_templates = _find_matching_templates(use_case.title, use_case.description)
    
    # Estimate feasibility
    feasibility = _assess_feasibility(use_case.description, matched_templates)
    
    # Suggest technologies
    suggested_tech = _suggest_technologies(use_case.description, matched_templates)
    
    # Estimate complexity and timeline
    complexity = _estimate_complexity(use_case.description)
    timeline = _estimate_timeline(complexity)
    
    # Get similar success stories
    success_stories = _get_success_stories(matched_templates)
    
    return UseCaseAnalysis(
        use_case_id=str(use_case.id),
        title=use_case.title,
        matched_templates=matched_templates,
        feasibility_score=feasibility["score"],
        feasibility_reason=feasibility["reason"],
        suggested_technologies=suggested_tech,
        estimated_complexity=complexity,
        estimated_timeline=timeline,
        similar_success_stories=success_stories
    )


# Helper functions

def _match_category(title: str, description: str) -> str:
    """Match use case to a category based on keywords"""
    text = f"{title} {description}".lower()
    
    category_keywords = {
        "Process Automation": ["automate", "automation", "workflow", "process", "manual"],
        "Predictive Analytics": ["predict", "forecast", "analytics", "risk", "score"],
        "Computer Vision": ["image", "vision", "visual", "camera", "photo", "video"],
        "Conversational AI": ["chatbot", "chat", "conversation", "assistant", "support"],
        "Document Processing": ["document", "ocr", "extract", "pdf", "invoice"],
        "Recommendation Systems": ["recommend", "personalize", "suggest", "preference"],
        "Anomaly Detection": ["anomaly", "fraud", "detect", "unusual", "outlier"],
        "Optimization": ["optimize", "schedule", "resource", "efficiency"]
    }
    
    best_match = "Process Automation"
    best_score = 0
    
    for category, keywords in category_keywords.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best_match = category
    
    return best_match


def _estimate_complexity(description: str) -> str:
    """Estimate complexity based on description keywords"""
    text = description.lower()
    
    high_complexity = ["real-time", "integration", "multiple systems", "enterprise", "scale", "complex"]
    medium_complexity = ["api", "database", "model", "training", "pipeline"]
    
    high_count = sum(1 for kw in high_complexity if kw in text)
    medium_count = sum(1 for kw in medium_complexity if kw in text)
    
    if high_count >= 2:
        return "High"
    elif medium_count >= 2 or high_count >= 1:
        return "Medium"
    return "Low"


def _get_recommendations(use_cases) -> List[UseCaseTemplate]:
    """Get recommended templates based on submitted use cases"""
    recommendations = []
    
    for uc in use_cases[:5]:  # Analyze top 5
        matches = _find_matching_templates(uc.title, uc.description)
        for match in matches[:2]:  # Top 2 per use case
            # Find full template
            for ind in KB_DATA.get("industries", []):
                for template in ind.get("use_cases", []):
                    if template["id"] == match.id:
                        recommendations.append(UseCaseTemplate(**template))
                        break
    
    # Remove duplicates
    seen = set()
    unique = []
    for r in recommendations:
        if r.id not in seen:
            seen.add(r.id)
            unique.append(r)
    
    return unique[:5]


def _find_matching_templates(title: str, description: str) -> List[UseCaseSearchResult]:
    """Find matching templates from knowledge base"""
    results = []
    query = f"{title} {description}".lower()
    
    for ind in KB_DATA.get("industries", []):
        for uc in ind.get("use_cases", []):
            template_text = f"{uc['title']} {uc['description']}".lower()
            
            score = difflib.SequenceMatcher(None, query, template_text).ratio()
            
            # Boost for keyword matches
            keywords = query.split()
            keyword_matches = sum(1 for kw in keywords if len(kw) > 3 and kw in template_text)
            score += keyword_matches * 0.1
            
            if score > 0.25:
                results.append(UseCaseSearchResult(
                    id=uc["id"],
                    title=uc["title"],
                    description=uc["description"],
                    industry=ind["id"],
                    industry_name=ind["name"],
                    category=uc["category"],
                    complexity=uc["complexity"],
                    typical_roi=uc["typical_roi"],
                    relevance_score=min(round(score, 2), 1.0)
                ))
    
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    return results[:5]


def _assess_feasibility(description: str, matches: List[UseCaseSearchResult]) -> dict:
    """Assess feasibility based on description and matched templates"""
    text = description.lower()
    
    # Check for complexity indicators
    high_risk = ["real-time", "legacy", "multiple integrations", "regulatory"]
    medium_risk = ["api", "training data", "model", "pipeline"]
    
    risk_score = sum(1 for kw in high_risk if kw in text) * 2
    risk_score += sum(1 for kw in medium_risk if kw in text)
    
    # Boost feasibility if we have good template matches
    if matches and matches[0].relevance_score > 0.5:
        risk_score -= 1
    
    if risk_score >= 3:
        return {"score": "Low", "reason": "High technical complexity and integration requirements"}
    elif risk_score >= 1:
        return {"score": "Medium", "reason": "Moderate complexity, requires careful planning and data preparation"}
    return {"score": "High", "reason": "Well-understood pattern with proven implementation approaches"}


def _suggest_technologies(description: str, matches: List[UseCaseSearchResult]) -> List[str]:
    """Suggest technologies based on use case"""
    suggested = set()
    
    # From matched templates
    for match in matches[:3]:
        for ind in KB_DATA.get("industries", []):
            for uc in ind.get("use_cases", []):
                if uc["id"] == match.id:
                    suggested.update(uc.get("technologies", []))
    
    # From keywords
    text = description.lower()
    if "chat" in text or "conversation" in text:
        suggested.add("LLM")
        suggested.add("RAG")
    if "image" in text or "visual" in text:
        suggested.add("CNN")
        suggested.add("Computer Vision")
    if "predict" in text or "forecast" in text:
        suggested.add("ML Classification")
        suggested.add("Time Series Analysis")
    if "document" in text or "ocr" in text:
        suggested.add("OCR")
        suggested.add("NLP")
    
    return list(suggested)[:8]


def _estimate_timeline(complexity: str) -> str:
    """Estimate implementation timeline"""
    timelines = {
        "Low": "1-2 months",
        "Medium": "3-6 months",
        "High": "6-12 months"
    }
    return timelines.get(complexity, "3-6 months")


def _get_success_stories(matches: List[UseCaseSearchResult]) -> List[dict]:
    """Get success stories from matched templates"""
    stories = []
    
    for match in matches[:3]:
        for ind in KB_DATA.get("industries", []):
            for uc in ind.get("use_cases", []):
                if uc["id"] == match.id:
                    stories.append({
                        "title": uc["title"],
                        "industry": ind["name"],
                        "roi": uc["typical_roi"],
                        "implementation_time": uc["implementation_time"]
                    })
    
    return stories


def _generate_workshop_summary(title: str, use_cases, categories: dict) -> str:
    """Generate AI summary for workshop"""
    if not use_cases:
        return "No use cases submitted yet. Encourage participants to submit their AI ideas."
    
    top_category = max(categories.items(), key=lambda x: x[1])[0] if categories else "General"
    
    return (
        f"Workshop '{title}' has {len(use_cases)} submitted use cases. "
        f"The primary focus area is {top_category}. "
        f"Based on the submissions, we recommend exploring industry templates "
        f"that align with your team's priorities. "
        f"Consider the feasibility and ROI metrics when prioritizing."
    )
