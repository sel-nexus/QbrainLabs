"""
API endpoints for US16: AI Copilot Assistant

Provides real-time AI-powered suggestions, engagement monitoring, anomaly detection,
discussion prompts, and summary generation for workshop facilitators.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
import uuid

from app.core.database import get_db
from app.core.socket_manager import sio
from app.api.auth import get_current_user
from app.models.models import (
    User, Workshop, Participant, UseCase, Vote,
    CopilotSuggestion, ParticipantEngagement, WorkshopSummary, 
    DetectedAnomaly, CopilotSettings,
    SuggestionStatus, CopilotMode
)
from app.schemas.copilot import (
    SuggestionsRequest, SuggestionsResponse, Suggestion, SuggestionAction,
    EnhanceContentRequest, EnhanceContentResponse, QualityScore,
    VarianceAnalysisRequest, VarianceAnalysisResponse,
    GenerateSummaryRequest, GenerateSummaryResponse, SummaryContent,
    TopRecommendation, ParticipantStats,
    DetectAnomaliesRequest, DetectAnomaliesResponse, Anomaly,
    DiscussionPromptsResponse, DiscussionPrompt,
    EngagementResponse, ParticipantEngagementMetrics, GroupEngagementMetrics, ParticipantAlert,
    UpdateSettingsRequest, CopilotSettingsResponse,
    DismissSuggestionRequest
)
from app.services.copilot_service import copilot_service

router = APIRouter(prefix="/api/copilot")


# ============================================================================
# Suggestions Endpoints
# ============================================================================

@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(
    request: SuggestionsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get contextual AI suggestions for the workshop.
    Only accessible by the workshop facilitator.
    """
    try:
        # Fetch workshop with related data
        workshop = await _get_workshop_with_data(request.workshop_id, db)
        
        # Verify user is the facilitator
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Only the facilitator can access copilot")
        
        # Get copilot settings
        settings = await _get_or_create_settings(request.workshop_id, db)
        
        # Generate suggestions
        suggestions = await copilot_service.generate_suggestions(
            workshop=workshop,
            participants=workshop.participants,
            use_cases=workshop.use_cases,
            votes=await _get_workshop_votes(request.workshop_id, db),
            settings=settings
        )
        
        # Store suggestions in database
        stored_suggestions = []
        for sugg in suggestions:
            db_suggestion = CopilotSuggestion(
                id=uuid.uuid4(),
                workshop_id=UUID(request.workshop_id),
                suggestion_type=sugg["type"],
                message=sugg["message"],
                priority=sugg["priority"],
                context=sugg.get("context", {}),
                actions=sugg.get("actions", [])
            )
            db.add(db_suggestion)
            
            stored_suggestions.append(Suggestion(
                id=str(db_suggestion.id),
                type=sugg["type"],
                message=sugg["message"],
                priority=sugg["priority"],
                actions=[SuggestionAction(**a) for a in sugg.get("actions", [])],
                context=sugg.get("context")
            ))
        
        await db.commit()
        
        return SuggestionsResponse(
            suggestions=stored_suggestions,
            mode=settings.mode if settings else "proactive",
            workshop_phase=workshop.current_phase
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggestions/dismiss")
async def dismiss_suggestion(
    request: DismissSuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dismiss or mark a suggestion as acted upon."""
    try:
        result = await db.execute(
            select(CopilotSuggestion).where(CopilotSuggestion.id == UUID(request.suggestion_id))
        )
        suggestion = result.scalar_one_or_none()
        
        if not suggestion:
            raise HTTPException(status_code=404, detail="Suggestion not found")
        
        # Verify access
        workshop = await _get_workshop(str(suggestion.workshop_id), db)
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update status
        from datetime import datetime
        suggestion.status = SuggestionStatus.ACTED_UPON.value if request.action == "acted_upon" else SuggestionStatus.DISMISSED.value
        suggestion.responded_at = datetime.utcnow()
        
        await db.commit()
        
        return {"success": True, "status": suggestion.status}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Engagement Endpoints
# ============================================================================

@router.get("/engagement/{workshop_id}", response_model=EngagementResponse)
async def get_engagement(
    workshop_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get participant engagement metrics for the workshop."""
    try:
        workshop = await _get_workshop_with_data(workshop_id, db)
        
        # Verify access
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Only the facilitator can access engagement data")
        
        votes = await _get_workshop_votes(workshop_id, db)
        
        engagement_data = await copilot_service.analyze_engagement(
            workshop_id=workshop_id,
            participants=workshop.participants,
            votes=votes,
            use_cases=workshop.use_cases
        )
        
        return EngagementResponse(
            participants=[
                ParticipantEngagementMetrics(
                    id=p["id"],
                    name=p["name"],
                    engagement_score=p["engagement_score"],
                    vote_count=p.get("vote_count", 0),
                    submission_count=p.get("submission_count", 0),
                    last_activity=p.get("last_activity"),
                    alerts=[ParticipantAlert(**a) for a in p.get("alerts", [])]
                )
                for p in engagement_data["participants"]
            ],
            group_metrics=GroupEngagementMetrics(
                avg_engagement=engagement_data["group_metrics"]["avg_engagement"],
                at_risk_count=engagement_data["group_metrics"]["at_risk_count"],
                total_participants=engagement_data["group_metrics"]["total_participants"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Variance Analysis Endpoints
# ============================================================================

@router.post("/analyze-variance", response_model=VarianceAnalysisResponse)
async def analyze_variance(
    request: VarianceAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze voting variance for a specific use case."""
    try:
        workshop = await _get_workshop(request.workshop_id, db)
        
        # Verify access
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        votes = await _get_workshop_votes(request.workshop_id, db)
        
        variance_data = await copilot_service.analyze_variance(
            use_case_id=request.use_case_id,
            votes=votes
        )
        
        # Generate recommendation if high variance
        recommendation = None
        if variance_data.get("is_significant"):
            recommendation = {
                "action": "pause_discussion",
                "message": "Consider pausing for a structured discussion to understand different perspectives."
            }
        
        return VarianceAnalysisResponse(
            use_case_id=variance_data["use_case_id"],
            vote_count=variance_data["vote_count"],
            mean=variance_data.get("mean"),
            std_dev=variance_data["std_dev"],
            is_significant=variance_data["is_significant"],
            is_bimodal=variance_data.get("is_bimodal", False),
            distribution=variance_data.get("distribution", {}),
            by_criterion=variance_data.get("by_criterion"),
            recommendation=recommendation
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Discussion Prompts Endpoints
# ============================================================================

@router.get("/discussion-prompts/{use_case_id}", response_model=DiscussionPromptsResponse)
async def get_discussion_prompts(
    use_case_id: str,
    workshop_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI-generated discussion prompts for a use case."""
    try:
        # Fetch use case
        result = await db.execute(
            select(UseCase).where(UseCase.id == UUID(use_case_id))
        )
        use_case = result.scalar_one_or_none()
        
        if not use_case:
            raise HTTPException(status_code=404, detail="Use case not found")
        
        # Verify access
        workshop = await _get_workshop(str(use_case.workshop_id), db)
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get variance data if available
        votes = await _get_workshop_votes(str(use_case.workshop_id), db)
        variance_data = await copilot_service.analyze_variance(use_case_id, votes)
        
        # Generate prompts
        prompts = await copilot_service.generate_discussion_prompts(
            use_case=use_case,
            variance_data=variance_data if variance_data.get("is_significant") else None
        )
        
        return DiscussionPromptsResponse(
            prompts=[DiscussionPrompt(**p) for p in prompts],
            use_case_id=use_case_id,
            use_case_title=use_case.title
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Content Enhancement Endpoints
# ============================================================================

@router.post("/enhance-content", response_model=EnhanceContentResponse)
async def enhance_content(
    request: EnhanceContentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enhance use case content with AI suggestions."""
    try:
        result = await copilot_service.enhance_content(
            content=request.content,
            context=request.context
        )
        
        return EnhanceContentResponse(
            enhanced=result["enhanced"],
            quality_score=QualityScore(**result["quality_score"]),
            improvements_made=result["improvements_made"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Summary Generation Endpoints
# ============================================================================

@router.post("/generate-summary", response_model=GenerateSummaryResponse)
async def generate_summary(
    request: GenerateSummaryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate workshop summary in the specified format."""
    try:
        workshop = await _get_workshop_with_data(request.workshop_id, db)
        
        # Verify access
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        votes = await _get_workshop_votes(request.workshop_id, db)
        
        # Generate summary
        summary_data = await copilot_service.generate_summary(
            workshop=workshop,
            use_cases=workshop.use_cases,
            votes=votes,
            participants=workshop.participants,
            format=request.format.value,
            sections=request.sections
        )
        
        # Store summary in database
        db_summary = WorkshopSummary(
            id=uuid.uuid4(),
            workshop_id=UUID(request.workshop_id),
            format=request.format.value,
            content=summary_data["executive_summary"],
            summary_metadata={
                "key_findings": summary_data["key_findings"],
                "next_steps": summary_data["next_steps"]
            },
            sections=request.sections or ["findings", "recommendations", "next_steps"]
        )
        db.add(db_summary)
        await db.commit()
        
        # Emit socket event
        await sio.emit(
            "copilot:summary_ready",
            {
                "workshop_id": request.workshop_id,
                "summary_id": str(db_summary.id),
                "format": request.format.value
            },
            room=request.workshop_id
        )
        
        return GenerateSummaryResponse(
            summary=SummaryContent(
                format=summary_data["format"],
                generated_at=summary_data["generated_at"],
                is_mock=summary_data.get("is_mock", False),
                executive_summary=summary_data["executive_summary"],
                key_findings=summary_data["key_findings"],
                top_recommendations=[
                    TopRecommendation(**r) for r in summary_data["top_recommendations"]
                ],
                next_steps=summary_data["next_steps"],
                participant_stats=ParticipantStats(**summary_data["participant_stats"])
            ),
            download_url=None  # Would be implemented for PDF export
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Anomaly Detection Endpoints
# ============================================================================

@router.post("/detect-anomalies", response_model=DetectAnomaliesResponse)
async def detect_anomalies(
    request: DetectAnomaliesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Detect anomalies in workshop data."""
    try:
        workshop = await _get_workshop_with_data(request.workshop_id, db)
        
        # Verify access
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        votes = await _get_workshop_votes(request.workshop_id, db)
        
        # Detect anomalies
        anomalies = await copilot_service.detect_anomalies(
            workshop_id=request.workshop_id,
            data_type=request.data_type.value,
            participants=workshop.participants,
            votes=votes,
            use_cases=workshop.use_cases
        )
        
        # Store significant anomalies
        for anom in anomalies:
            if anom["severity"] in ["warning", "critical"]:
                db_anomaly = DetectedAnomaly(
                    id=uuid.uuid4(),
                    workshop_id=UUID(request.workshop_id),
                    anomaly_type=anom["type"],
                    severity=anom["severity"],
                    details=anom["details"],
                    recommendation=anom.get("recommendation")
                )
                db.add(db_anomaly)
        
        await db.commit()
        
        return DetectAnomaliesResponse(
            anomalies=[
                Anomaly(
                    type=a["type"],
                    severity=a["severity"],
                    details=a["details"],
                    recommendation=a.get("recommendation")
                )
                for a in anomalies
            ],
            data_type=request.data_type.value,
            workshop_id=request.workshop_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Settings Endpoints
# ============================================================================

@router.get("/settings/{workshop_id}", response_model=CopilotSettingsResponse)
async def get_settings(
    workshop_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get copilot settings for a workshop."""
    try:
        workshop = await _get_workshop(workshop_id, db)
        
        # Verify access
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        settings = await _get_or_create_settings(workshop_id, db)
        
        return CopilotSettingsResponse(
            workshop_id=workshop_id,
            mode=settings.mode,
            engagement_alerts_enabled=settings.engagement_alerts_enabled,
            voting_anomaly_alerts_enabled=settings.voting_anomaly_alerts_enabled,
            content_suggestions_enabled=settings.content_suggestions_enabled,
            discussion_prompts_enabled=settings.discussion_prompts_enabled,
            inactivity_threshold_minutes=int(settings.inactivity_threshold_minutes),
            variance_alert_threshold=float(settings.variance_alert_threshold),
            rapid_voting_threshold_seconds=int(settings.rapid_voting_threshold_seconds)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings/{workshop_id}", response_model=CopilotSettingsResponse)
async def update_settings(
    workshop_id: str,
    request: UpdateSettingsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update copilot settings for a workshop."""
    try:
        workshop = await _get_workshop(workshop_id, db)
        
        # Verify access
        if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin_user:
            raise HTTPException(status_code=403, detail="Access denied")
        
        settings = await _get_or_create_settings(workshop_id, db)
        
        # Update fields if provided
        if request.mode is not None:
            settings.mode = request.mode.value
        if request.engagement_alerts_enabled is not None:
            settings.engagement_alerts_enabled = request.engagement_alerts_enabled
        if request.voting_anomaly_alerts_enabled is not None:
            settings.voting_anomaly_alerts_enabled = request.voting_anomaly_alerts_enabled
        if request.content_suggestions_enabled is not None:
            settings.content_suggestions_enabled = request.content_suggestions_enabled
        if request.discussion_prompts_enabled is not None:
            settings.discussion_prompts_enabled = request.discussion_prompts_enabled
        if request.inactivity_threshold_minutes is not None:
            settings.inactivity_threshold_minutes = str(request.inactivity_threshold_minutes)
        if request.variance_alert_threshold is not None:
            settings.variance_alert_threshold = str(request.variance_alert_threshold)
        if request.rapid_voting_threshold_seconds is not None:
            settings.rapid_voting_threshold_seconds = str(request.rapid_voting_threshold_seconds)
        
        await db.commit()
        
        return CopilotSettingsResponse(
            workshop_id=workshop_id,
            mode=settings.mode,
            engagement_alerts_enabled=settings.engagement_alerts_enabled,
            voting_anomaly_alerts_enabled=settings.voting_anomaly_alerts_enabled,
            content_suggestions_enabled=settings.content_suggestions_enabled,
            discussion_prompts_enabled=settings.discussion_prompts_enabled,
            inactivity_threshold_minutes=int(settings.inactivity_threshold_minutes),
            variance_alert_threshold=float(settings.variance_alert_threshold),
            rapid_voting_threshold_seconds=int(settings.rapid_voting_threshold_seconds)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Helper Functions
# ============================================================================

async def _get_workshop(workshop_id: str, db: AsyncSession) -> Workshop:
    """Fetch workshop by ID."""
    result = await db.execute(
        select(Workshop).where(Workshop.id == UUID(workshop_id))
    )
    workshop = result.scalar_one_or_none()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    return workshop


async def _get_workshop_with_data(workshop_id: str, db: AsyncSession) -> Workshop:
    """Fetch workshop with participants and use cases."""
    result = await db.execute(
        select(Workshop)
        .options(
            selectinload(Workshop.participants),
            selectinload(Workshop.use_cases)
        )
        .where(Workshop.id == UUID(workshop_id))
    )
    workshop = result.scalar_one_or_none()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    return workshop


async def _get_workshop_votes(workshop_id: str, db: AsyncSession) -> List[Vote]:
    """Fetch all votes for a workshop."""
    # Get all use case IDs for this workshop
    uc_result = await db.execute(
        select(UseCase.id).where(UseCase.workshop_id == UUID(workshop_id))
    )
    use_case_ids = [row[0] for row in uc_result.fetchall()]
    
    if not use_case_ids:
        return []
    
    # Fetch votes for these use cases
    votes_result = await db.execute(
        select(Vote).where(Vote.use_case_id.in_(use_case_ids))
    )
    return list(votes_result.scalars().all())


async def _get_or_create_settings(workshop_id: str, db: AsyncSession) -> CopilotSettings:
    """Get or create copilot settings for a workshop."""
    result = await db.execute(
        select(CopilotSettings).where(CopilotSettings.workshop_id == UUID(workshop_id))
    )
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = CopilotSettings(
            id=uuid.uuid4(),
            workshop_id=UUID(workshop_id)
        )
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    return settings
