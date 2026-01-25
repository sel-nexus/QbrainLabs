from typing import List, Optional
from datetime import date, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_

from app.core.database import get_db
from app.models import (
    Workshop, UseCase, User, 
    AnalyticsSnapshot, CustomDashboard, GeneratedReport, IndustryBenchmark
)
from app.api.auth import get_current_user
from app.schemas.analytics import (
    AnalyticsOverviewResponse, WorkshopPerformance, CategoryDistribution,
    CustomDashboardCreate, CustomDashboardUpdate, CustomDashboardResponse,
    ReportCreate, ReportResponse, BenchmarkResponse, BenchmarkMetric
)

router = APIRouter()

# --- Analytics Overview ---

@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_analytics_overview(
    period_start: Optional[date] = None,
    period_end: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get high-level analytics overview for the user's organization"""
    # NOTE: In a real implementation, we would aggregate data from AnalyticsSnapshot
    # For MVP, we calculate live from Workshop tables
    
    # Filter by date range
    today = date.today()
    if not period_end:
        period_end = today
    if not period_start:
        period_start = today - timedelta(days=30)
        
    # Query Workshops
    query = select(Workshop).where(Workshop.created_at >= period_start)
    if current_user.organization_id:
        query = query.where(Workshop.organization_id == current_user.organization_id)
    else:
        # If not in org, just show own workshops
        # This logic might need adjusting based on exact requirements
        pass 
        
    result = await db.execute(query)
    workshops = result.scalars().all()
    
    total_workshops = len(workshops)
    active_workshops = sum(1 for w in workshops if w.status == "active")
    completed_workshops = sum(1 for w in workshops if w.status == "completed")
    
    # Calculate dummy engagement (placeholder)
    avg_engagement = 0.75 if total_workshops > 0 else 0
    total_participants = sum(len(w.participants) for w in workshops) if hasattr(workshops[0], 'participants') else 0
    
    performance = WorkshopPerformance(
        total_workshops=total_workshops,
        active_workshops=active_workshops,
        completed_workshops=completed_workshops,
        avg_engagement=avg_engagement,
        total_participants=total_participants
    )
    
    # Dummy Categories
    categories = [
        CategoryDistribution(category="Process Automation", count=15, percentage=0.45, avg_score=7.8),
        CategoryDistribution(category="Customer Experience", count=10, percentage=0.30, avg_score=8.2),
        CategoryDistribution(category="Risk & Compliance", count=8, percentage=0.25, avg_score=6.5),
    ]
    
    return AnalyticsOverviewResponse(
        organization_id=current_user.organization_id,
        period="last_30_days",
        performance=performance,
        categories=categories,
        recent_trend=[{"date": str(today), "value": 10}]
    )


# --- Custom Dashboards ---

@router.post("/dashboards", response_model=CustomDashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dashboard_in: CustomDashboardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new custom dashboard configuration"""
    dashboard = CustomDashboard(
        **dashboard_in.dict(),
        user_id=current_user.id,
        organization_id=current_user.organization_id
    )
    db.add(dashboard)
    await db.commit()
    await db.refresh(dashboard)
    return dashboard


@router.get("/dashboards", response_model=List[CustomDashboardResponse])
async def get_dashboards(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all dashboards visible to the user"""
    query = select(CustomDashboard).where(
        (CustomDashboard.user_id == current_user.id) | 
        (and_(CustomDashboard.organization_id == current_user.organization_id, CustomDashboard.is_shared == True))
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/dashboards/{dashboard_id}", response_model=CustomDashboardResponse)
async def get_dashboard(
    dashboard_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific dashboard details"""
    result = await db.execute(select(CustomDashboard).where(CustomDashboard.id == dashboard_id))
    dashboard = result.scalar_one_or_none()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    # Permission check
    if dashboard.user_id != current_user.id:
        if not (dashboard.is_shared and dashboard.organization_id == current_user.organization_id):
            raise HTTPException(status_code=403, detail="Not authorized to access this dashboard")
            
    return dashboard


@router.delete("/dashboards/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom dashboard"""
    result = await db.execute(select(CustomDashboard).where(CustomDashboard.id == dashboard_id))
    dashboard = result.scalar_one_or_none()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if dashboard.user_id != current_user.id:
         raise HTTPException(status_code=403, detail="Not authorized to delete this dashboard")
         
    await db.delete(dashboard)
    await db.commit()
    return None


# --- Reporting ---

@router.post("/reports/generate", response_model=ReportResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_report(
    report_in: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger generation of a PDF/CSV report"""
    # Logic to queue report generation task would go here
    # For now, we simulate a completed report record
    
    # Check if organization exists for user in non-MVP
    org_id = current_user.organization_id
    if not org_id:
         # raise HTTPException(status_code=400, detail="User must belong to an organization to generate reports")
         pass # Allow personal reports?
    
    report = GeneratedReport(
        organization_id=org_id, # Can be null if personal
        created_by=current_user.id,
        title=report_in.title,
        report_type=report_in.report_type,
        format=report_in.format,
        period_start=report_in.period_start,
        period_end=report_in.period_end,
        parameters=report_in.parameters,
        file_url="https://storage.hotspotmatrix.ai/reports/sample.pdf", # Placeholder
        file_size_bytes=1024 * 500 # 500kb
    )
    
    # In real world: db.add(report) -> commit -> background_task.generate(report.id)
    # db.add(report)
    # await db.commit()
    # await db.refresh(report)
    
    # Returning mock response as we haven't added GeneratedReport to db session properly due to missing org id constraints potentially
    return ReportResponse(
        id=report.id,
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


# --- Benchmarking ---

@router.get("/benchmarks", response_model=BenchmarkResponse)
async def get_benchmarks(
    industry: Optional[str] = "Technology",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get industry benchmarks for comparison"""
    
    # Mock data for MVP
    metrics = [
        BenchmarkMetric(
            metric_name="Use Case Implementation Rate",
            your_value=0.35,
            industry_avg=0.28,
            percentile=75.0,
            industry_p10=0.10,
            industry_p90=0.45
        ),
        BenchmarkMetric(
            metric_name="Avg Feasibility Score",
            your_value=6.8,
            industry_avg=7.2,
            percentile=40.0,
            industry_p10=5.5,
            industry_p90=8.5
        )
    ]
    
    return BenchmarkResponse(
        industry=industry or "General",
        period="2025-Q4",
        metrics=metrics
    )
