"""
Advanced Analytics API Endpoints
Provides deep insights, heatmaps, and executive-level reporting
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta, date
import statistics
import uuid
from collections import defaultdict

from app.utils.matrix import (
    calculate_agreement_score, 
    detect_scale_max, 
    get_scale_factor, 
    calculate_matrix_position,
    STANDARD_X_KEYWORDS,
    STANDARD_Y_KEYWORDS
)
from app.core.database import get_db
from app.models.models import Workshop, UseCase, Vote, Participant, WorkshopStatus
from app.models.analytics import AnalyticsSnapshot, GeneratedReport, IndustryBenchmark
from app.api.auth import get_current_user, get_current_active_user, get_optional_user
from app.middleware.error_handler import NotFoundException
from app.schemas.analytics import (
    AnalyticsOverviewResponse, 
    BenchmarkResponse, 
    ReportResponse, 
    ReportCreate,
    WorkshopPerformance,
    CategoryDistribution,
    BenchmarkMetric
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_overview(
    period: str = "30d",
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get high-level analytics overview for the organization.
    """
    # Calculate date range
    today = date.today()
    start_date = today - timedelta(days=30)
    if period == "7d":
        start_date = today - timedelta(days=7)
    elif period == "90d":
        start_date = today - timedelta(days=90)
    elif period == "year":
        start_date = today - timedelta(days=365)
        
    # Get workshops in period (using created_at which is DateTime)
    # Convert dates to datetime for comparison
    start_dt = datetime.combine(start_date, datetime.min.time())
    
    result = await db.execute(
        select(Workshop)
        .where(Workshop.created_at >= start_dt)
        .options(selectinload(Workshop.participants))
    )
    workshops = result.scalars().all()
    
    # Calculate workshop stats
    total_workshops = len(workshops)
    # Fix: Count both OPEN and IN_PROGRESS as active
    active_workshops = sum(1 for w in workshops if w.status in ["OPEN", "IN_PROGRESS", "active"])
    completed_workshops = sum(1 for w in workshops if w.status in ["COMPLETED", "completed"])
    
    # Get participants and use cases count via subqueries or loop aggregation
    # For MVP, loop aggregation is acceptable if N is small
    workshop_ids = [w.id for w in workshops]
    
    total_participants = 0
    # Create simple performance object
    if workshop_ids:
        # Get use cases
        uc_result = await db.execute(
            select(UseCase).where(UseCase.workshop_id.in_(workshop_ids))
        )
        use_cases = uc_result.scalars().all()
        
        # Get total participants across these workshops
        # Note: This might double count unique users, which is often intended for "engagements" vs "unique users"
        total_participants = sum(len(w.participants) for w in workshops if w.participants)
        
        avg_engagement = 0.75  # Mocked/calculated engagement score
    else:
        use_cases = []
        avg_engagement = 0.0

    performance = WorkshopPerformance(
        total_workshops=total_workshops,
        active_workshops=active_workshops,
        completed_workshops=completed_workshops,
        avg_engagement=avg_engagement,
        total_participants=total_participants,
        total_usecases=len(use_cases)
    )
    
    # Calculate Category Distribution
    categories_map = defaultdict(list)
    for uc in use_cases:
        categories_map[uc.category or "Uncategorized"].append(uc)
        
    categories_dist = []
    total_uc = len(use_cases)
    
    for cat, ucs in categories_map.items():
        categories_dist.append(CategoryDistribution(
            category=cat,
            count=len(ucs),
            percentage=round(len(ucs) / total_uc * 100, 1) if total_uc > 0 else 0,
            avg_score=7.5  # optimize: calculate actual avg score if needed
        ))
    
    # Sort by count
    categories_dist.sort(key=lambda x: x.count, reverse=True)
    
    # Mock Trend Data (Activity over time)
    recent_trend = []
    current_point = start_date
    while current_point <= today:
        # Handle potential None created_at values by falling back to today's date for old data or skipping
        daily_workshops = [w for w in workshops if w.created_at and w.created_at.date() == current_point]
        
        # Safe handling for use cases with potentially None created_at (though we just added the column, old ones might be null)
        daily_use_cases = []
        for uc in use_cases:
            uc_date = uc.created_at.date() if hasattr(uc, 'created_at') and uc.created_at else None
            # Fallback logic: if no created_at, assume it belongs to the workshop's creation date or today
            # ideally, we should migrate data. For now, we skip if None to avoid crash
            if uc_date == current_point:
                daily_use_cases.append(uc)
                
        recent_trend.append({
            "date": current_point.isoformat(),
            "value": len(daily_workshops) + len(daily_use_cases)
        })
        current_point += timedelta(days=1)
        
    # Downsample if too many points
    if len(recent_trend) > 20: 
        step = len(recent_trend) // 20
        recent_trend = recent_trend[::step]

    return AnalyticsOverviewResponse(
        organization_id=current_user.organization_id if hasattr(current_user, "organization_id") else None,
        period=period,
        performance=performance,
        categories=categories_dist[:5], # Top 5
        recent_trend=recent_trend
    )


@router.get("/benchmarks", response_model=BenchmarkResponse)
async def get_benchmarks(
    industry: Optional[str] = "Technology",
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get organization benchmarks compared to industry.
    """
    # In a real app, this would query the IndustryBenchmark table
    # For MVP, we'll return realistic mocked data based on the industry
    
    return BenchmarkResponse(
        industry=industry or "Technology",
        period="2025-Q4",
        metrics=[
            BenchmarkMetric(
                metric_name="Innovation Index",
                your_value=7.8,
                industry_avg=6.5,
                percentile=82,
                industry_p10=4.0,
                industry_p90=8.5
            ),
            BenchmarkMetric(
                metric_name="Implementation Rate",
                your_value=45.0,
                industry_avg=32.0,
                percentile=75,
                industry_p10=15.0,
                industry_p90=60.0
            ),
            BenchmarkMetric(
                metric_name="Feasibility Score",
                your_value=6.2,
                industry_avg=6.8,
                percentile=40,
                industry_p10=4.5,
                industry_p90=8.2
            ),
            BenchmarkMetric(
                metric_name="Participant Engagement",
                your_value=92.0,
                industry_avg=75.0,
                percentile=95,
                industry_p10=50.0,
                industry_p90=88.0
            )
        ]
    )


@router.post("/reports/generate", response_model=ReportResponse)
async def generate_report(
    report_in: ReportCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a new analytics report.
    """
    # Create report record
    report = GeneratedReport(
        title=report_in.title,
        report_type=report_in.report_type,
        format=report_in.format,
        period_start=report_in.period_start or date.today() - timedelta(days=30),
        period_end=report_in.period_end or date.today(),
        created_by=current_user.id,
        organization_id=current_user.organization_id if hasattr(current_user, "organization_id") else uuid.uuid4(), # Fallback for local
        status="completed", # Creating async if expensive
        file_url=f"https://storage.qbrainlabs.com/reports/{uuid.uuid4()}.pdf", # Mock URL
        file_size_bytes=1024 * 1024 * 2 # 2MB
    )
    
    # In reality, this would trigger a background task to generate the PDF
    
    return ReportResponse(
        id=uuid.uuid4(),
        title=report.title,
        report_type=report.report_type,
        format=report.format,
        period_start=report.period_start,
        period_end=report.period_end,
        file_url=report.file_url,
        file_size_bytes=report.file_size_bytes,
        status="completed",
        created_at=datetime.utcnow()
    )


@router.get("/workshop/{workshop_id}/heatmap")
async def get_voting_heatmap(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get voting heatmap data showing participant voting patterns.
    Returns a matrix of participants vs criteria with average scores.
    """
    # Verify workshop exists
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get all votes for this workshop
    result = await db.execute(
        select(Vote)
        .join(UseCase, Vote.use_case_id == UseCase.id)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(Vote.participant), selectinload(Vote.use_case))
    )
    votes = result.scalars().all()
    
    # Build heatmap data
    participant_data = defaultdict(lambda: {"scores": defaultdict(list), "name": ""})
    all_criteria = set()
    
    for vote in votes:
        if vote.participant and vote.scores:
            pid = str(vote.participant_id)
            participant_data[pid]["name"] = vote.participant.display_name
            for criterion, score in vote.scores.items():
                participant_data[pid]["scores"][criterion].append(float(score))
                all_criteria.add(criterion)
    
    # Calculate averages for heatmap
    heatmap_rows = []
    for pid, data in participant_data.items():
        row = {
            "participant_id": pid,
            "participant_name": data["name"],
            "scores": {}
        }
        for criterion in all_criteria:
            scores = data["scores"].get(criterion, [])
            if scores:
                row["scores"][criterion] = round(sum(scores) / len(scores), 2)
            else:
                row["scores"][criterion] = None
        heatmap_rows.append(row)
    
    return {
        "workshop_id": workshop_id,
        "criteria": list(all_criteria),
        "heatmap": heatmap_rows,
        "participant_count": len(heatmap_rows)
    }


@router.get("/workshop/{workshop_id}/agreement")
async def get_agreement_metrics(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get agreement/disagreement metrics for each use case.
    Shows where participants aligned or diverged in their scoring.
    """
    # Verify workshop exists
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get all use cases with votes
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases = result.scalars().all()
    
    agreement_data = []
    
    for uc in use_cases:
        if not uc.votes:
            continue
            
        criteria_stats = {}
        for vote in uc.votes:
            if not vote.scores:
                continue
            for criterion, score in vote.scores.items():
                if criterion not in criteria_stats:
                    criteria_stats[criterion] = []
                criteria_stats[criterion].append(float(score))
        
        # Calculate agreement metrics for each criterion
        criteria_agreement = {}
        overall_scores = []
        
        # Determine scale for this use case
        all_uc_scores = []
        for scores in criteria_stats.values():
            all_uc_scores.extend(scores)
        scale_max = detect_scale_max(all_uc_scores)
        
        for criterion, scores in criteria_stats.items():
            if len(scores) >= 2:
                std_dev = statistics.stdev(scores)
                mean = statistics.mean(scores)
                min_val = min(scores)
                max_val = max(scores)
                range_val = max_val - min_val
                
                # Use centralized agreement calculation
                agreement_score = calculate_agreement_score(scores, scale_max)
                
                criteria_agreement[criterion] = {
                    "mean": round(mean, 2),
                    "std_dev": round(std_dev, 2),
                    "variance": round(statistics.variance(scores), 2),
                    "min": round(min_val, 2),
                    "max": round(max_val, 2),
                    "range": round(range_val, 2),
                    "agreement_score": round(agreement_score, 1),
                    "vote_count": len(scores)
                }
                overall_scores.append(agreement_score)
        
        # Overall agreement score for this use case
        overall_agreement = sum(overall_scores) / len(overall_scores) if overall_scores else 0
        
        agreement_data.append({
            "use_case_id": str(uc.id),
            "title": uc.title,
            "vote_count": len(uc.votes),
            "overall_agreement": round(overall_agreement, 1),
            "criteria_agreement": criteria_agreement,
            "consensus_level": "High" if overall_agreement >= 70 else "Medium" if overall_agreement >= 40 else "Low"
        })
    
    # Sort by agreement score
    agreement_data.sort(key=lambda x: x["overall_agreement"], reverse=True)
    
    return {
        "workshop_id": workshop_id,
        "use_cases": agreement_data,
        "summary": {
            "high_consensus_count": len([d for d in agreement_data if d["overall_agreement"] >= 70]),
            "medium_consensus_count": len([d for d in agreement_data if 40 <= d["overall_agreement"] < 70]),
            "low_consensus_count": len([d for d in agreement_data if d["overall_agreement"] < 40]),
            "avg_agreement": round(sum(d["overall_agreement"] for d in agreement_data) / len(agreement_data), 1) if agreement_data else 0
        }
    }


@router.get("/workshop/{workshop_id}/distribution")
async def get_score_distribution(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get score distribution analysis for the workshop.
    Shows how scores are distributed across criteria.
    """
    # Verify workshop exists
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get all votes
    result = await db.execute(
        select(Vote)
        .join(UseCase, Vote.use_case_id == UseCase.id)
        .where(UseCase.workshop_id == workshop_id)
    )
    votes = result.scalars().all()
    
    # Aggregate scores by criterion
    criteria_scores = defaultdict(list)
    for vote in votes:
        if vote.scores:
            for criterion, score in vote.scores.items():
                criteria_scores[criterion].append(float(score))
    
    # Calculate distribution for each criterion
    distributions = {}
    for criterion, scores in criteria_scores.items():
        if scores:
            scale_max = detect_scale_max(scores)
            # Create histogram buckets (10 buckets)
            # If scale is 10: [0-1, 1-2, ..., 9-10]
            # If scale is 100: [0-10, 10-20, ..., 90-100]
            buckets = [0] * 10
            bucket_size = scale_max / 10
            for score in scores:
                bucket_idx = min(int(score / bucket_size), 9)
                buckets[bucket_idx] += 1
            
            distributions[criterion] = {
                "histogram": buckets,
                "total_votes": len(scores),
                "mean": round(statistics.mean(scores), 2),
                "median": round(statistics.median(scores), 2),
                "std_dev": round(statistics.stdev(scores), 2) if len(scores) > 1 else 0,
                "min": round(min(scores), 2),
                "max": round(max(scores), 2),
                "quartiles": {
                    "q1": round(sorted(scores)[len(scores)//4], 2) if len(scores) >= 4 else None,
                    "q2": round(statistics.median(scores), 2),
                    "q3": round(sorted(scores)[3*len(scores)//4], 2) if len(scores) >= 4 else None
                }
            }
    
    return {
        "workshop_id": workshop_id,
        "distributions": distributions,
        "total_votes": len(votes)
    }


@router.get("/workshop/{workshop_id}/quadrant-analysis")
async def get_quadrant_analysis(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get quadrant analysis with use case categorization.
    """
    # Verify workshop exists
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get aggregated results
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases = result.scalars().all()
    
    quadrants = {
        "quick_wins": [],      # High Value, High Feasibility
        "strategic_bets": [],  # High Value, Low Feasibility
        "nice_to_have": [],    # Low Value, High Feasibility
        "dont_do": []          # Low Value, Low Feasibility
    }
    
    workshop_config = workshop.config or {}
    template_id = workshop.ws_template_id if hasattr(workshop, 'ws_template_id') else None
    
    # Analyze all scores to detect scale
    all_scores = []
    for uc in use_cases:
        for vote in uc.votes:
            if vote.scores:
                all_scores.extend([float(s) for s in vote.scores.values()])
    
    scale_max = detect_scale_max(all_scores)
    threshold = scale_max / 2  # Dynamic threshold
    norm_threshold = 50.0
    
    for uc in use_cases:
        if not uc.votes:
            continue
        
        # Calculate average scores
        scores_sum = defaultdict(float)
        scores_count = defaultdict(int)
        
        for vote in uc.votes:
            if vote.scores:
                for criterion, score in vote.scores.items():
                    scores_sum[criterion] += float(score)
                    scores_count[criterion] += 1
        
        avg_scores = {k: scores_sum[k] / scores_count[k] for k in scores_sum}
        
        # Determine X and Y coordinates using centralized standardized logic
        x_val, y_val = calculate_matrix_position(avg_scores, template_id, scale_max)
        
        if x_val is None or y_val is None:
            continue
        
        # Normalize back to raw scale for quadrant comparison if x_val/y_val are 0-100
        # Wait, x_val and y_val are returned on 0-100 scale by calculate_matrix_position.
        # So we should compare them against a 50.0 threshold if they are normalized.
        # OR we keep them on their raw scale for the quadrant logic here?
        # Actually, let's keep threshold at 50.0 if we use calc_matrix_pos's normalized output.
        

        
        use_case_data = {
            "id": str(uc.id),
            "title": uc.title,
            "x": round(x_val, 2),
            "y": round(y_val, 2),
            "vote_count": len(uc.votes),
            "scores": {k: round(v, 2) for k, v in avg_scores.items()}
        }
        
        # Categorize into quadrant based on normalized 0-100 coordinates
        if y_val >= norm_threshold and x_val >= norm_threshold:
            quadrants["quick_wins"].append(use_case_data)
        elif y_val >= norm_threshold and x_val < norm_threshold:
            quadrants["strategic_bets"].append(use_case_data)
        elif y_val < norm_threshold and x_val >= norm_threshold:
            quadrants["nice_to_have"].append(use_case_data)
        else:
            quadrants["dont_do"].append(use_case_data)
    
    # Sort each quadrant by total score (y + x)
    for quadrant in quadrants.values():
        quadrant.sort(key=lambda x: x["y"] + x["x"], reverse=True)
    
    return {
        "workshop_id": workshop_id,
        "threshold": threshold, # Still return raw threshold for UI if needed
        "norm_threshold": norm_threshold,
        "scale_max": scale_max,
        "quadrants": quadrants,
        "summary": {
            "quick_wins_count": len(quadrants["quick_wins"]),
            "strategic_bets_count": len(quadrants["strategic_bets"]),
            "nice_to_have_count": len(quadrants["nice_to_have"]),
            "dont_do_count": len(quadrants["dont_do"]),
            "total_use_cases": sum(len(q) for q in quadrants.values())
        }
    }


@router.get("/workshop/{workshop_id}/executive-summary")
async def get_executive_summary(
    workshop_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate executive summary for the workshop.
    Combines all analytics into a digestible format.
    """
    # Verify workshop exists
    workshop_result = await db.execute(
        select(Workshop)
        .where(Workshop.id == workshop_id)
        .options(selectinload(Workshop.participants))
    )
    workshop = workshop_result.scalars().first()
    if not workshop:
        raise NotFoundException("Workshop", workshop_id)
    
    # Get use cases with votes
    result = await db.execute(
        select(UseCase)
        .where(UseCase.workshop_id == workshop_id)
        .options(selectinload(UseCase.votes))
    )
    use_cases = result.scalars().all()
    
    # Calculate key metrics
    total_use_cases = len(use_cases)
    total_votes = sum(len(uc.votes) for uc in use_cases)
    total_participants = len(workshop.participants) if workshop.participants else 0
    
    # Get top 5 by value
    ranked_use_cases = []
    for uc in use_cases:
        if not uc.votes:
            continue
        
        scores_sum = defaultdict(float)
        scores_count = defaultdict(int)
        
        for vote in uc.votes:
            if vote.scores:
                for criterion, score in vote.scores.items():
                    scores_sum[criterion] += float(score)
                    scores_count[criterion] += 1
        
        avg_scores = {k: scores_sum[k] / scores_count[k] for k in scores_sum}
        total_score = sum(avg_scores.values()) / len(avg_scores) if avg_scores else 0
        
        ranked_use_cases.append({
            "id": str(uc.id),
            "title": uc.title,
            "category": uc.category,
            "total_score": round(total_score, 2),
            "vote_count": len(uc.votes),
            "scores": {k: round(v, 2) for k, v in avg_scores.items()}
        })
    
    ranked_use_cases.sort(key=lambda x: x["total_score"], reverse=True)
    
    # Calculate participation rate
    avg_votes_per_use_case = total_votes / total_use_cases if total_use_cases > 0 else 0
    participation_rate = (avg_votes_per_use_case / total_participants * 100) if total_participants > 0 else 0
    
    return {
        "workshop_id": workshop_id,
        "workshop_title": workshop.title,
        "generated_at": datetime.utcnow().isoformat(),
        "metrics": {
            "total_participants": total_participants,
            "total_use_cases": total_use_cases,
            "total_votes": total_votes,
            "avg_votes_per_use_case": round(avg_votes_per_use_case, 1),
            "participation_rate": round(participation_rate, 1)
        },
        "top_5_use_cases": ranked_use_cases[:5],
        "recommendations": [
            {
                "priority": "High",
                "title": uc["title"],
                "score": uc["total_score"],
                "rationale": f"Ranked #{i+1} with {uc['vote_count']} votes and average score of {uc['total_score']}"
            }
            for i, uc in enumerate(ranked_use_cases[:3])
        ] if ranked_use_cases else []
    }


@router.get("/cross-workshop/comparison")
async def compare_workshops(
    workshop_ids: str = Query(..., description="Comma-separated workshop IDs"),
    db: AsyncSession = Depends(get_db)
):
    """
    Compare metrics across multiple workshops.
    """
    ids = [wid.strip() for wid in workshop_ids.split(",")]
    
    comparisons = []
    for workshop_id in ids:
        # Get workshop data
        workshop_result = await db.execute(
            select(Workshop)
            .where(Workshop.id == workshop_id)
            .options(selectinload(Workshop.participants))
        )
        workshop = workshop_result.scalars().first()
        
        if not workshop:
            continue
        
        # Get use cases
        uc_result = await db.execute(
            select(UseCase)
            .where(UseCase.workshop_id == workshop_id)
            .options(selectinload(UseCase.votes))
        )
        use_cases = uc_result.scalars().all()
        
        total_votes = sum(len(uc.votes) for uc in use_cases)
        
        comparisons.append({
            "workshop_id": workshop_id,
            "title": workshop.title,
            "status": workshop.status,
            "participant_count": len(workshop.participants) if workshop.participants else 0,
            "use_case_count": len(use_cases),
            "vote_count": total_votes,
            "avg_votes_per_use_case": round(total_votes / len(use_cases), 1) if use_cases else 0
        })
    
    return {
        "workshops": comparisons,
        "comparison_generated_at": datetime.utcnow().isoformat()
    }
