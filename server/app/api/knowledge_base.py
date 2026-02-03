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


class AddUseCaseRequest(BaseModel):
    title: str
    description: str
    industry_id: str
    category: str
    complexity: str = "Medium"
    typical_roi: str = "TBD"
    implementation_time: str = "3-6 months"
    technologies: List[str] = []


router = APIRouter(prefix="/api/knowledge-base", tags=["knowledge-base"])


# Load knowledge base data
def load_knowledge_base():
    try:
        with open("app/data/knowledge_base.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return {"industries": [], "categories": [], "technologies": []}

KB_DATA = load_knowledge_base()


# Save knowledge base data
def save_knowledge_base(data):
    try:
        with open("app/data/knowledge_base.json", "w") as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving knowledge base: {e}")
        return False


@router.get("/overview", response_model=KnowledgeBaseOverview)
async def get_knowledge_base_overview(
    current_user: User = Depends(get_current_user)
):
    """
    Get overview of the AI Knowledge Base
    Available to all authenticated users (admin and facilitators)
    """
    total_use_cases = sum(len(ind.get("use_cases", [])) for ind in KB_DATA.get("industries", []))
    
    industries_summary = [
        {
            "id": ind["id"],
            "name": ind["name"],
            "icon": ind["icon"],
            "use_case_count": len(ind.get("use_cases", []))
        }
        for ind in KB_DATA.get("industries", [])
    ]
    
    return KnowledgeBaseOverview(
        total_industries=len(KB_DATA.get("industries", [])),
        total_use_cases=total_use_cases,
        total_categories=len(KB_DATA.get("categories", [])),
        total_technologies=len(KB_DATA.get("technologies", [])),
        industries=industries_summary
    )


@router.get("/industries", response_model=List[Industry])
async def get_industries(
    current_user: User = Depends(get_current_user)
):
    """
    Get all industries with their use case templates
    """
    return [Industry(**ind) for ind in KB_DATA.get("industries", [])]


@router.get("/industries/{industry_id}", response_model=Industry)
async def get_industry(
    industry_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific industry with its use cases
    """
    for ind in KB_DATA.get("industries", []):
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
    Search the knowledge base for relevant use case templates
    Uses fuzzy matching for relevance scoring
    """
    results = []
    query_lower = query.lower()
    
    for ind in KB_DATA.get("industries", []):
        # Apply industry filter
        if industry and ind["id"] != industry:
            continue
            
        for uc in ind.get("use_cases", []):
            # Apply category filter
            if category and uc["category"].lower() != category.lower():
                continue
            
            # Apply complexity filter
            if complexity and uc["complexity"].lower() != complexity.lower():
                continue
            
            # Calculate relevance score using fuzzy matching
            title_score = difflib.SequenceMatcher(None, query_lower, uc["title"].lower()).ratio()
            desc_score = difflib.SequenceMatcher(None, query_lower, uc["description"].lower()).ratio()
            cat_score = difflib.SequenceMatcher(None, query_lower, uc["category"].lower()).ratio()
            
            # Weighted score
            relevance = (title_score * 0.5) + (desc_score * 0.3) + (cat_score * 0.2)
            
            # Also check for keyword matches
            if query_lower in uc["title"].lower() or query_lower in uc["description"].lower():
                relevance = max(relevance, 0.8)
            
            if relevance > 0.2:  # Threshold
                results.append(UseCaseSearchResult(
                    id=uc["id"],
                    title=uc["title"],
                    description=uc["description"],
                    industry=ind["id"],
                    industry_name=ind["name"],
                    category=uc["category"],
                    complexity=uc["complexity"],
                    typical_roi=uc["typical_roi"],
                    relevance_score=round(relevance, 2)
                ))
    
    # Sort by relevance
    results.sort(key=lambda x: x.relevance_score, reverse=True)
    return results[:20]  # Top 20 results


@router.post("/refresh", response_model=List[UseCaseSearchResult])
async def refresh_use_cases(
    request: RefreshRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Refresh use cases from public research (simulated).
    US26: Connects to Perplexity/Google to find trending use cases.
    """
    results = []
    
    # Determine industry name
    industry_name = "General"
    if request.industry_id:
        for ind in KB_DATA.get("industries", []):
            if ind["id"] == request.industry_id:
                industry_name = ind["name"]
                break
    
    # Call RAG service to get trending use cases
    fresh_use_cases = await rag_service.find_trending_use_cases(
        industry=industry_name,
        count=3
    )
    
    for item in fresh_use_cases:
        results.append(UseCaseSearchResult(**item))
        
    return results


@router.post("/add", response_model=UseCaseSearchResult)
async def add_use_case(
    request: AddUseCaseRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Add a new use case to the knowledge base library
    """
    # Create new use case object
    new_id = f"{request.industry_id}-{uuid.uuid4().hex[:6]}"
    
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
        "kpis": []
    }
    
    # Find industry and add use case
    industry_found = False
    industry_name = "Unknown"
    
    # Reload data to ensure we have latest
    global KB_DATA
    KB_DATA = load_knowledge_base()
    
    for ind in KB_DATA.get("industries", []):
        if ind["id"] == request.industry_id:
            ind["use_cases"].append(new_use_case)
            industry_name = ind["name"]
            industry_found = True
            break
            
    if not industry_found:
        raise HTTPException(status_code=404, detail="Industry not found")
        
    # Save back to file
    if not save_knowledge_base(KB_DATA):
        raise HTTPException(status_code=500, detail="Failed to save knowledge base")
        
    return UseCaseSearchResult(
        id=new_id,
        title=new_use_case["title"],
        description=new_use_case["description"],
        industry=request.industry_id,
        industry_name=industry_name,
        category=new_use_case["category"],
        complexity=new_use_case["complexity"],
        typical_roi=new_use_case["typical_roi"],
        relevance_score=1.0
    )


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
