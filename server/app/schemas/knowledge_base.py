"""
Knowledge Base Schemas for AI Use Case Library
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class UseCaseTemplate(BaseModel):
    id: str
    title: str
    description: str
    category: str
    complexity: str
    data_requirements: str
    typical_roi: str
    implementation_time: str
    technologies: List[str]
    kpis: List[str]


class Industry(BaseModel):
    id: str
    name: str
    icon: str
    use_cases: List[UseCaseTemplate]


class Category(BaseModel):
    id: str
    name: str
    description: str


class Technology(BaseModel):
    id: str
    name: str
    description: str


class ComplexityLevel(BaseModel):
    description: str
    team_size: str


class KnowledgeBaseOverview(BaseModel):
    total_industries: int
    total_use_cases: int
    total_categories: int
    total_technologies: int
    industries: List[Dict[str, Any]]


class UseCaseSearchResult(BaseModel):
    id: str
    title: str
    description: str
    industry: str
    industry_name: str
    category: str
    complexity: str
    typical_roi: str
    relevance_score: float
    # Smart filtering fields
    is_new: Optional[bool] = None
    is_refinable: Optional[bool] = None
    existing_usecase_id: Optional[str] = None
    refinement_suggestions: Optional[str] = None


class WorkshopInsight(BaseModel):
    workshop_id: str
    workshop_title: str
    total_use_cases: int
    categories_distribution: Dict[str, int]
    complexity_distribution: Dict[str, int]
    recommended_templates: List[UseCaseTemplate]
    ai_summary: Optional[str] = None


class UseCaseAnalysis(BaseModel):
    use_case_id: str
    title: str
    matched_templates: List[UseCaseSearchResult]
    feasibility_score: str
    feasibility_reason: str
    suggested_technologies: List[str]
    estimated_complexity: str
    estimated_timeline: str
    similar_success_stories: List[Dict[str, Any]]


class KnowledgeBaseStats(BaseModel):
    total_searches: int
    popular_industries: List[Dict[str, int]]
    popular_categories: List[Dict[str, int]]
    recent_matches: List[Dict[str, Any]]
