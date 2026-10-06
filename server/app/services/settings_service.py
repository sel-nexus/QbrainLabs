"""
Settings Service
US33: Database-Driven Configuration Management

Provides centralized settings management with in-memory caching.
"""
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
import logging

from app.models.settings import SystemSetting, SettingsAuditLog, DEFAULT_SYSTEM_SETTINGS

logger = logging.getLogger(__name__)

_SENSITIVE_KEY_PATTERNS = ("secret", "password", "token", "key", "api", "credential")


def _mask_if_sensitive(key: str, value: Any) -> Any:
    """Return '***REDACTED***' if the setting key suggests a sensitive value."""
    if isinstance(value, str) and any(p in key.lower() for p in _SENSITIVE_KEY_PATTERNS):
        return "***REDACTED***"
    return value


# In-memory cache with TTL
_settings_cache: Dict[str, tuple] = {}
_cache_ttl_seconds = 60  # Cache TTL in seconds


def _is_cache_valid(cached_at: datetime) -> bool:
    """Check if cached value is still valid."""
    return (datetime.utcnow() - cached_at).total_seconds() < _cache_ttl_seconds


async def get_setting(
    db: AsyncSession, 
    key: str, 
    use_cache: bool = True,
    default: Any = None
) -> Any:
    """
    Get a setting value by key.
    Uses in-memory cache for performance.
    
    Args:
        db: Database session
        key: Setting key (e.g., 'rate_limit.registration.daily')
        use_cache: Whether to use cached value
        default: Default value if setting not found
    
    Returns:
        Setting value or default
    """
    # Check cache first
    if use_cache and key in _settings_cache:
        cached_value, cached_at = _settings_cache[key]
        if _is_cache_valid(cached_at):
            return cached_value
    
    # Query database
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if setting:
        value = setting.value
        # Update cache
        _settings_cache[key] = (value, datetime.utcnow())
        return value
    
    return default


async def get_settings_by_category(
    db: AsyncSession, 
    category: str
) -> List[SystemSetting]:
    """Get all settings for a category."""
    result = await db.execute(
        select(SystemSetting)
        .where(SystemSetting.category == category)
        .order_by(SystemSetting.key)
    )
    return result.scalars().all()


async def get_all_settings(db: AsyncSession) -> List[SystemSetting]:
    """Get all system settings."""
    result = await db.execute(
        select(SystemSetting).order_by(SystemSetting.category, SystemSetting.key)
    )
    return result.scalars().all()


async def update_setting(
    db: AsyncSession,
    key: str,
    value: Any,
    updated_by: Optional[str] = None,
    ip_address: Optional[str] = None
) -> Optional[SystemSetting]:
    """
    Update a setting value.
    Creates audit log entry and invalidates cache.
    
    Args:
        db: Database session
        key: Setting key
        value: New value
        updated_by: User ID who made the change
        ip_address: IP address of the requester
    
    Returns:
        Updated setting or None if not found
    """
    # Get current setting
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        logger.warning(f"Setting not found: {key}")
        return None
    
    # Always check the value's type; min/max/length rules apply only when set.
    validation_error = _validate_value(value, setting.value_type, setting.validation_rules or {})
    if validation_error:
        raise ValueError(validation_error)
    
    old_value = setting.value
    
    # Create audit log entry — redact sensitive values before persisting
    audit_entry = SettingsAuditLog(
        setting_id=setting.id,
        setting_key=key,
        old_value=_mask_if_sensitive(key, old_value),
        new_value=_mask_if_sensitive(key, value),
        changed_by=updated_by,
        ip_address=ip_address
    )
    db.add(audit_entry)
    
    # Update setting
    setting.value = value
    setting.updated_by = updated_by
    setting.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(setting)
    
    # Invalidate cache
    invalidate_cache(key)
    
    logger.info(
        "Setting updated: %s = %s (was: %s)",
        key,
        _mask_if_sensitive(key, value),
        _mask_if_sensitive(key, old_value),
    )
    
    return setting


async def reset_setting_to_default(
    db: AsyncSession,
    key: str,
    updated_by: Optional[str] = None,
    ip_address: Optional[str] = None
) -> Optional[SystemSetting]:
    """Reset a setting to its default value."""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        return None
    
    return await update_setting(
        db, key, setting.default_value, updated_by, ip_address
    )


def _validate_value(value: Any, value_type: str, rules: dict) -> Optional[str]:
    """Validate a setting value against its rules."""
    if value_type == "number":
        if not isinstance(value, (int, float)):
            return f"Value must be a number, got {type(value).__name__}"
        if "min" in rules and value < rules["min"]:
            return f"Value must be at least {rules['min']}"
        if "max" in rules and value > rules["max"]:
            return f"Value must be at most {rules['max']}"
    elif value_type == "boolean":
        if not isinstance(value, bool):
            return f"Value must be a boolean, got {type(value).__name__}"
    elif value_type == "string":
        if not isinstance(value, str):
            return f"Value must be a string, got {type(value).__name__}"
        if "min_length" in rules and len(value) < rules["min_length"]:
            return f"Value must be at least {rules['min_length']} characters"
        if "max_length" in rules and len(value) > rules["max_length"]:
            return f"Value must be at most {rules['max_length']} characters"
    
    return None


def invalidate_cache(key: Optional[str] = None):
    """
    Invalidate settings cache.
    
    Args:
        key: Specific key to invalidate, or None to clear all
    """
    global _settings_cache
    if key:
        _settings_cache.pop(key, None)
        logger.debug(f"Cache invalidated for key: {key}")
    else:
        _settings_cache.clear()
        logger.debug("All settings cache invalidated")


async def get_rate_limit(db: AsyncSession, limit_type: str) -> int:
    """
    Get rate limit from settings, with fallback to defaults.
    
    Args:
        db: Database session
        limit_type: 'daily', 'weekly', or 'monthly'
    
    Returns:
        Rate limit value
    """
    key = f"rate_limit.registration.{limit_type}"
    
    # Fallback defaults (matching original constants)
    defaults = {"daily": 10, "weekly": 20, "monthly": 50}
    default = defaults.get(limit_type, 10)
    
    value = await get_setting(db, key, default=default)
    
    # Ensure we return an int
    if isinstance(value, (int, float)):
        return int(value)
    return default


async def get_password_rules(db: AsyncSession) -> dict:
    """
    Get password validation rules from settings.
    
    Returns:
        Dictionary with password rules
    """
    rules = {
        "min_length": await get_setting(db, "security.password.min_length", default=8),
        "max_length": await get_setting(db, "security.password.max_length", default=128),
        "require_uppercase": await get_setting(db, "security.password.require_uppercase", default=True),
        "require_lowercase": await get_setting(db, "security.password.require_lowercase", default=True),
        "require_digit": await get_setting(db, "security.password.require_digit", default=True),
        "require_special": await get_setting(db, "security.password.require_special", default=False),
    }
    return rules


async def is_feature_enabled(db: AsyncSession, feature: str) -> bool:
    """
    Check if a feature is enabled.
    
    Args:
        db: Database session
        feature: Feature name (e.g., 'ai_enhancement')
    
    Returns:
        True if enabled, False otherwise
    """
    key = f"features.{feature}"
    return await get_setting(db, key, default=True)


async def get_limit(db: AsyncSession, limit_name: str) -> int:
    """
    Get a limit value from settings.
    
    Args:
        db: Database session
        limit_name: Limit name (e.g., 'workshop.max_facilitators')
    
    Returns:
        Limit value
    """
    key = f"limits.{limit_name}"
    
    # Fallback defaults
    defaults = {
        "workshop.max_facilitators": 10,
        "workshop.max_participants": 100,
        "workshop.max_use_cases": 200,
    }
    
    return await get_setting(db, key, default=defaults.get(limit_name, 100))


async def seed_default_settings(db: AsyncSession) -> int:
    """
    Seed default system settings if they don't exist.
    
    Returns:
        Number of settings created
    """
    created_count = 0
    
    for setting_data in DEFAULT_SYSTEM_SETTINGS:
        # Check if setting already exists
        result = await db.execute(
            select(SystemSetting).where(SystemSetting.key == setting_data["key"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            setting = SystemSetting(
                key=setting_data["key"],
                value=setting_data["value"],
                value_type=setting_data["value_type"],
                default_value=setting_data["default_value"],
                category=setting_data["category"],
                description=setting_data.get("description"),
                validation_rules=setting_data.get("validation_rules"),
                is_sensitive=setting_data.get("is_sensitive", False)
            )
            db.add(setting)
            created_count += 1
            logger.info(f"Created setting: {setting_data['key']}")
    
    if created_count > 0:
        await db.commit()
        logger.info(f"Seeded {created_count} default settings")
    
    return created_count


async def get_settings_audit_log(
    db: AsyncSession,
    setting_key: Optional[str] = None,
    limit: int = 50
) -> List[SettingsAuditLog]:
    """
    Get settings audit log entries.
    
    Args:
        db: Database session
        setting_key: Optional filter by setting key
        limit: Maximum entries to return
    
    Returns:
        List of audit log entries
    """
    query = select(SettingsAuditLog).order_by(SettingsAuditLog.changed_at.desc())
    
    if setting_key:
        query = query.where(SettingsAuditLog.setting_key == setting_key)
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()
