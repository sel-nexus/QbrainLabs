"""
Subscription & Feature Flags Models
US33: Database-Driven Configuration Management

Supports:
- Subscription tiers with configurable limits
- Feature flags with global defaults and organization overrides
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, Integer, ForeignKey, Index, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class SubscriptionTier(Base):
    """
    Defines subscription tiers with configurable limits.
    Organizations can be assigned to a tier to control their resource limits.
    """
    __tablename__ = "subscription_tiers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)  # e.g., FREE, STARTER, PROFESSIONAL
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Resource limits
    max_users = Column(Integer, nullable=False, default=5)  # -1 = unlimited
    max_workshops_per_month = Column(Integer, nullable=False, default=3)
    max_participants_per_workshop = Column(Integer, nullable=False, default=25)
    max_use_cases_per_workshop = Column(Integer, nullable=False, default=100)
    
    # Enabled features (list of feature flag names)
    features = Column(JSONType, default=list)
    
    # Pricing
    price_monthly = Column(Numeric(10, 2), default=0)
    price_yearly = Column(Numeric(10, 2), default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SubscriptionTier {self.name}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "max_users": self.max_users,
            "max_workshops_per_month": self.max_workshops_per_month,
            "max_participants_per_workshop": self.max_participants_per_workshop,
            "max_use_cases_per_workshop": self.max_use_cases_per_workshop,
            "features": self.features or [],
            "price_monthly": float(self.price_monthly) if self.price_monthly else 0,
            "price_yearly": float(self.price_yearly) if self.price_yearly else 0,
            "is_active": self.is_active,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class FeatureFlag(Base):
    """
    Feature flags for enabling/disabling features globally.
    Can be overridden per-organization for beta testing or custom plans.
    """
    __tablename__ = "feature_flags"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)  # e.g., ai_enhancement
    display_name = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    default_enabled = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)  # Soft delete
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    overrides = relationship("FeatureFlagOverride", back_populates="flag", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FeatureFlag {self.name}>"

    def to_dict(self, include_overrides: bool = False):
        result = {
            "id": str(self.id),
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "default_enabled": self.default_enabled,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_overrides:
            result["overrides"] = [o.to_dict() for o in self.overrides]
        return result


class FeatureFlagOverride(Base):
    """
    Organization-specific feature flag overrides.
    Allows enabling/disabling features for specific organizations.
    """
    __tablename__ = "feature_flag_overrides"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    flag_id = Column(GUID(), ForeignKey("feature_flags.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    is_enabled = Column(Boolean, nullable=False)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    flag = relationship("FeatureFlag", back_populates="overrides")
    organization = relationship("Organization")
    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("idx_override_flag_org", "flag_id", "organization_id", unique=True),
    )

    def __repr__(self):
        return f"<FeatureFlagOverride flag={self.flag_id} org={self.organization_id}>"

    def to_dict(self):
        return {
            "id": str(self.id),
            "flag_id": str(self.flag_id),
            "organization_id": str(self.organization_id),
            "organization_name": self.organization.name if self.organization else None,
            "is_enabled": self.is_enabled,
            "created_by": str(self.created_by) if self.created_by else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Default subscription tiers to seed
DEFAULT_SUBSCRIPTION_TIERS = [
    {
        "name": "FREE",
        "display_name": "Free",
        "description": "Perfect for individuals and small teams getting started",
        "max_users": 5,
        "max_workshops_per_month": 3,
        "max_participants_per_workshop": 25,
        "max_use_cases_per_workshop": 100,
        "features": ["basic_surveys", "basic_analytics"],
        "price_monthly": 0,
        "price_yearly": 0,
        "sort_order": 1,
    },
    {
        "name": "STARTER",
        "display_name": "Starter",
        "description": "For growing teams that need more capacity",
        "max_users": 15,
        "max_workshops_per_month": 10,
        "max_participants_per_workshop": 50,
        "max_use_cases_per_workshop": 200,
        "features": ["basic_surveys", "basic_analytics", "advanced_analytics", "export_csv"],
        "price_monthly": 29,
        "price_yearly": 290,
        "sort_order": 2,
    },
    {
        "name": "PROFESSIONAL",
        "display_name": "Professional",
        "description": "Full-featured plan for professional teams",
        "max_users": 50,
        "max_workshops_per_month": 25,
        "max_participants_per_workshop": 100,
        "max_use_cases_per_workshop": 500,
        "features": ["basic_surveys", "basic_analytics", "advanced_analytics", 
                     "export_csv", "export_pdf", "ai_enhancement", "knowledge_base"],
        "price_monthly": 99,
        "price_yearly": 990,
        "sort_order": 3,
    },
    {
        "name": "ENTERPRISE",
        "display_name": "Enterprise",
        "description": "Unlimited access for large organizations",
        "max_users": -1,  # Unlimited
        "max_workshops_per_month": -1,
        "max_participants_per_workshop": -1,
        "max_use_cases_per_workshop": -1,
        "features": ["all"],
        "price_monthly": 299,
        "price_yearly": 2990,
        "sort_order": 4,
    },
]

# Default feature flags to seed
DEFAULT_FEATURE_FLAGS = [
    {
        "name": "ai_enhancement",
        "display_name": "AI Use Case Enhancement",
        "description": "Enable AI-powered use case refinement and suggestions",
        "default_enabled": True,
    },
    {
        "name": "survey_management",
        "display_name": "Survey Management",
        "description": "Create and manage surveys within workshops",
        "default_enabled": True,
    },
    {
        "name": "knowledge_base",
        "display_name": "Knowledge Base Access",
        "description": "Access to the AI use case knowledge base library",
        "default_enabled": True,
    },
    {
        "name": "export_pdf",
        "display_name": "PDF Export",
        "description": "Export workshop results as PDF documents",
        "default_enabled": True,
    },
    {
        "name": "export_csv",
        "display_name": "CSV Export",
        "description": "Export workshop data as CSV files",
        "default_enabled": True,
    },
    {
        "name": "websocket_realtime",
        "display_name": "Real-time Collaboration",
        "description": "Enable real-time updates via WebSocket",
        "default_enabled": True,
    },
    {
        "name": "marketplace",
        "display_name": "Template Marketplace",
        "description": "Access to the workshop template marketplace",
        "default_enabled": False,
    },
    {
        "name": "advanced_analytics",
        "display_name": "Advanced Analytics",
        "description": "Access to advanced analytics and reporting features",
        "default_enabled": True,
    },
    {
        "name": "custom_branding",
        "display_name": "Custom Organization Branding",
        "description": "Customize organization branding and themes",
        "default_enabled": False,
    },
]
