"""
Analytics Models

This module defines database models for advanced analytics,
snapshots, generated reports, and benchmarking data.
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import Column, String, Integer, Float, Date, DateTime, Boolean, ForeignKey, Index, BigInteger
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class AnalyticsSnapshot(Base):
    """Daily/Weekly snapshots of organization metrics"""
    __tablename__ = "analytics_snapshots"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=True)
    
    snapshot_date = Column(Date, nullable=False, default=date.today)
    period_type = Column(String(20), default="daily")  # daily, weekly, monthly
    
    # Core Metrics
    active_workshops = Column(Integer, default=0)
    total_participants = Column(Integer, default=0)
    total_use_cases = Column(Integer, default=0)
    total_votes = Column(Integer, default=0)
    
    # Engagement
    avg_engagement_score = Column(Float)
    completion_rate = Column(Float)
    
    # Detailed breakdown (JSON storage for flexibility)
    metrics = Column(JSONType, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_analytics_org_date', 'organization_id', 'snapshot_date'),
    )


class CustomDashboard(Base):
    """User-created custom analytics dashboards"""
    __tablename__ = "custom_dashboards"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=True)
    
    name = Column(String(200), nullable=False)
    description = Column(String(500))
    
    # Layout and configuration
    widgets = Column(JSONType, default=list)  # Array of widget config objects
    layout = Column(JSONType)  # Grid layout positions
    filters = Column(JSONType)  # Default filters
    
    # Sharing
    is_shared = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    organization = relationship("Organization")


class GeneratedReport(Base):
    """Archived generated reports (PDF/CSV/etc)"""
    __tablename__ = "generated_reports"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    created_by = Column(GUID(), ForeignKey("users.id"))
    
    title = Column(String(200), nullable=False)
    report_type = Column(String(50), nullable=False)  # workshop_summary, quarterly_review, trend_analysis
    format = Column(String(10), default="pdf")  # pdf, csv, xlsx
    
    # Date range
    period_start = Column(Date)
    period_end = Column(Date)
    
    # Storage
    file_url = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger)
    
    # Metadata
    parameters = Column(JSONType)  # Filters used
    summary_data = Column(JSONType)  # Key findings extraction
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    organization = relationship("Organization")
    creator = relationship("User")


class IndustryBenchmark(Base):
    """Aggregated industry benchmark data"""
    __tablename__ = "industry_benchmarks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    
    industry = Column(String(50), nullable=False)
    metric_name = Column(String(100), nullable=False)
    period = Column(String(20), nullable=False)  # e.g., "2025-Q4"
    
    # Values
    p10_value = Column(Float)
    p50_value = Column(Float)  # Median
    p90_value = Column(Float)
    avg_value = Column(Float)
    
    sample_size = Column(Integer)
    
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_benchmark_industry_metric', 'industry', 'metric_name'),
    )
