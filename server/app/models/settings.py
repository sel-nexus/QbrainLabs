"""
System Settings Models
US33: Database-Driven Configuration Management

Provides centralized key-value configuration store with audit logging.
Uses PostgreSQL-native types (JSONB, TIMESTAMPTZ, INET) when available.
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class InetType(String):
    """
    IP Address type that uses PostgreSQL's INET type when available,
    falls back to VARCHAR(45) for SQLite compatibility.
    """
    pass


class SystemSetting(Base):
    """
    Centralized key-value configuration store.
    Stores application settings that can be modified at runtime without code deployment.
    """
    __tablename__ = "system_settings"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(JSONType, nullable=False)
    value_type = Column(String(20), nullable=False)  # 'string', 'number', 'boolean', 'json'
    default_value = Column(JSONType, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # 'rate_limiting', 'security', 'limits', 'features'
    description = Column(Text, nullable=True)
    is_sensitive = Column(Boolean, default=False)  # Hide value in logs
    validation_rules = Column(JSONType, nullable=True)  # {"min": 1, "max": 1000}
    updated_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Indexes
    __table_args__ = (
        Index("idx_settings_category", "category"),
    )

    def __repr__(self):
        return f"<SystemSetting {self.key}={self.value}>"

    def to_dict(self, include_sensitive: bool = False):
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "key": self.key,
            "value": self.value if (include_sensitive or not self.is_sensitive) else "***",
            "value_type": self.value_type,
            "default_value": self.default_value,
            "category": self.category,
            "description": self.description,
            "is_sensitive": self.is_sensitive,
            "validation_rules": self.validation_rules,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SettingsAuditLog(Base):
    """
    Audit log for system settings changes.
    Tracks who changed what setting and when.
    """
    __tablename__ = "settings_audit_log"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    setting_id = Column(GUID(), ForeignKey("system_settings.id", ondelete="SET NULL"), nullable=True)
    setting_key = Column(String(100), nullable=False)
    old_value = Column(JSONType, nullable=True)
    new_value = Column(JSONType, nullable=True)
    changed_by = Column(GUID(), ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime, default=datetime.utcnow)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length

    # Relationships
    setting = relationship("SystemSetting", foreign_keys=[setting_id])

    # Indexes
    __table_args__ = (
        Index("idx_audit_setting", "setting_id"),
        Index("idx_audit_time", "changed_at"),
        Index("idx_audit_key", "setting_key"),
    )

    def __repr__(self):
        return f"<SettingsAuditLog {self.setting_key} changed at {self.changed_at}>"

    def to_dict(self):
        """Convert to dictionary for API response."""
        return {
            "id": str(self.id),
            "setting_id": str(self.setting_id) if self.setting_id else None,
            "setting_key": self.setting_key,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "changed_by": str(self.changed_by) if self.changed_by else None,
            "changed_at": self.changed_at.isoformat() if self.changed_at else None,
            "ip_address": self.ip_address,
        }


# Default system settings to seed
DEFAULT_SYSTEM_SETTINGS = [
    # Rate Limiting
    {
        "key": "rate_limit.registration.daily",
        "value": 10,
        "value_type": "number",
        "default_value": 10,
        "category": "rate_limiting",
        "description": "Maximum facilitator registrations per 24 hours",
        "validation_rules": {"min": 1, "max": 1000}
    },
    {
        "key": "rate_limit.registration.weekly",
        "value": 20,
        "value_type": "number",
        "default_value": 20,
        "category": "rate_limiting",
        "description": "Maximum facilitator registrations per 7 days",
        "validation_rules": {"min": 1, "max": 5000}
    },
    {
        "key": "rate_limit.registration.monthly",
        "value": 50,
        "value_type": "number",
        "default_value": 50,
        "category": "rate_limiting",
        "description": "Maximum facilitator registrations per 30 days",
        "validation_rules": {"min": 1, "max": 10000}
    },
    # Security - Password
    {
        "key": "security.password.min_length",
        "value": 8,
        "value_type": "number",
        "default_value": 8,
        "category": "security",
        "description": "Minimum password length",
        "validation_rules": {"min": 6, "max": 128}
    },
    {
        "key": "security.password.max_length",
        "value": 128,
        "value_type": "number",
        "default_value": 128,
        "category": "security",
        "description": "Maximum password length",
        "validation_rules": {"min": 16, "max": 256}
    },
    {
        "key": "security.password.require_uppercase",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "security",
        "description": "Require at least one uppercase letter"
    },
    {
        "key": "security.password.require_lowercase",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "security",
        "description": "Require at least one lowercase letter"
    },
    {
        "key": "security.password.require_digit",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "security",
        "description": "Require at least one digit"
    },
    {
        "key": "security.password.require_special",
        "value": False,
        "value_type": "boolean",
        "default_value": False,
        "category": "security",
        "description": "Require at least one special character"
    },
    # Limits
    {
        "key": "limits.workshop.max_facilitators",
        "value": 10,
        "value_type": "number",
        "default_value": 10,
        "category": "limits",
        "description": "Maximum facilitators per workshop",
        "validation_rules": {"min": 1, "max": 50}
    },
    {
        "key": "limits.workshop.max_participants",
        "value": 100,
        "value_type": "number",
        "default_value": 100,
        "category": "limits",
        "description": "Maximum participants per workshop",
        "validation_rules": {"min": 1, "max": 1000}
    },
    {
        "key": "limits.workshop.max_use_cases",
        "value": 200,
        "value_type": "number",
        "default_value": 200,
        "category": "limits",
        "description": "Maximum use cases per workshop",
        "validation_rules": {"min": 10, "max": 1000}
    },
    # Features
    {
        "key": "features.ai_enhancement",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "features",
        "description": "Enable AI-powered use case enhancement"
    },
    {
        "key": "features.knowledge_base",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "features",
        "description": "Enable Knowledge Base access"
    },
    {
        "key": "features.survey_management",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "features",
        "description": "Enable Survey Management features"
    },
    {
        "key": "features.export_pdf",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "features",
        "description": "Enable PDF export functionality"
    },
    {
        "key": "features.export_csv",
        "value": True,
        "value_type": "boolean",
        "default_value": True,
        "category": "features",
        "description": "Enable CSV export functionality"
    },
]
