"""
System Settings API endpoints
US33: Database-Driven Configuration Management

Admin-only endpoints for managing system settings.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db
from app.middleware.admin_auth import require_admin
from app.models.models import User
from app.models.settings import SystemSetting, SettingsAuditLog
from app.services import settings_service

router = APIRouter(prefix="/api/admin/settings", tags=["admin-settings"])


# Pydantic schemas
class SettingResponse(BaseModel):
    id: str
    key: str
    value: Any
    value_type: str
    default_value: Any
    category: str
    description: Optional[str]
    is_sensitive: bool
    validation_rules: Optional[dict]
    updated_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: Any


class SettingsListResponse(BaseModel):
    settings: List[SettingResponse]
    categories: List[str]


class AuditLogEntry(BaseModel):
    id: str
    setting_id: Optional[str]
    setting_key: str
    old_value: Any
    new_value: Any
    changed_by: Optional[str]
    changed_at: Optional[datetime]
    ip_address: Optional[str]

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    entries: List[AuditLogEntry]
    total: int


@router.get("", response_model=SettingsListResponse)
async def get_all_settings(
    category: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all system settings, optionally filtered by category.
    Admin only.
    """
    if category:
        settings = await settings_service.get_settings_by_category(db, category)
    else:
        settings = await settings_service.get_all_settings(db)
    
    # Get unique categories
    categories_result = await db.execute(
        select(SystemSetting.category).distinct()
    )
    categories = [row[0] for row in categories_result]
    
    return SettingsListResponse(
        settings=[
            SettingResponse(
                id=str(s.id),
                key=s.key,
                value=s.value if not s.is_sensitive else "***",
                value_type=s.value_type,
                default_value=s.default_value,
                category=s.category,
                description=s.description,
                is_sensitive=s.is_sensitive,
                validation_rules=s.validation_rules,
                updated_at=s.updated_at,
                created_at=s.created_at
            )
            for s in settings
        ],
        categories=sorted(categories)
    )


@router.get("/{key:path}", response_model=SettingResponse)
async def get_setting(
    key: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific setting by key.
    Admin only.
    """
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting not found: {key}"
        )
    
    return SettingResponse(
        id=str(setting.id),
        key=setting.key,
        value=setting.value if not setting.is_sensitive else "***",
        value_type=setting.value_type,
        default_value=setting.default_value,
        category=setting.category,
        description=setting.description,
        is_sensitive=setting.is_sensitive,
        validation_rules=setting.validation_rules,
        updated_at=setting.updated_at,
        created_at=setting.created_at
    )


@router.put("/{key:path}", response_model=SettingResponse)
async def update_setting(
    key: str,
    update: SettingUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a system setting value.
    Admin only. Creates an audit log entry.
    """
    # Get IP address
    ip_address = None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip_address = forwarded.split(",")[0].strip()
    else:
        ip_address = request.headers.get("X-Real-IP") or \
                    (request.client.host if request.client else None)
    
    try:
        setting = await settings_service.update_setting(
            db=db,
            key=key,
            value=update.value,
            updated_by=str(admin.id),
            ip_address=ip_address
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting not found: {key}"
        )
    
    return SettingResponse(
        id=str(setting.id),
        key=setting.key,
        value=setting.value if not setting.is_sensitive else "***",
        value_type=setting.value_type,
        default_value=setting.default_value,
        category=setting.category,
        description=setting.description,
        is_sensitive=setting.is_sensitive,
        validation_rules=setting.validation_rules,
        updated_at=setting.updated_at,
        created_at=setting.created_at
    )


@router.post("/{key:path}/reset", response_model=SettingResponse)
async def reset_setting_to_default(
    key: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Reset a setting to its default value.
    Admin only. Creates an audit log entry.
    """
    # Get IP address
    ip_address = None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip_address = forwarded.split(",")[0].strip()
    else:
        ip_address = request.headers.get("X-Real-IP") or \
                    (request.client.host if request.client else None)
    
    setting = await settings_service.reset_setting_to_default(
        db=db,
        key=key,
        updated_by=str(admin.id),
        ip_address=ip_address
    )
    
    if not setting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Setting not found: {key}"
        )
    
    return SettingResponse(
        id=str(setting.id),
        key=setting.key,
        value=setting.value if not setting.is_sensitive else "***",
        value_type=setting.value_type,
        default_value=setting.default_value,
        category=setting.category,
        description=setting.description,
        is_sensitive=setting.is_sensitive,
        validation_rules=setting.validation_rules,
        updated_at=setting.updated_at,
        created_at=setting.created_at
    )


@router.get("/audit/log", response_model=AuditLogResponse)
async def get_audit_log(
    setting_key: Optional[str] = None,
    limit: int = 50,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get settings audit log entries.
    Admin only.
    """
    entries = await settings_service.get_settings_audit_log(
        db=db,
        setting_key=setting_key,
        limit=limit
    )
    
    return AuditLogResponse(
        entries=[
            AuditLogEntry(
                id=str(e.id),
                setting_id=str(e.setting_id) if e.setting_id else None,
                setting_key=e.setting_key,
                old_value=e.old_value,
                new_value=e.new_value,
                changed_by=str(e.changed_by) if e.changed_by else None,
                changed_at=e.changed_at,
                ip_address=e.ip_address
            )
            for e in entries
        ],
        total=len(entries)
    )


@router.post("/cache/invalidate")
async def invalidate_settings_cache(
    key: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Invalidate settings cache.
    Admin only.
    """
    settings_service.invalidate_cache(key)
    
    return {
        "success": True,
        "message": f"Cache invalidated for {'all settings' if not key else key}"
    }


@router.post("/seed")
async def seed_default_settings(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Seed any missing default settings.
    Admin only.
    """
    count = await settings_service.seed_default_settings(db)
    
    return {
        "success": True,
        "message": f"Seeded {count} new settings"
    }
