"""
LLM Model Configuration Registry API
Admin-managed registry of LLM provider configs (embedding / decision /
reasoning roles), selectable per workshop.
"""
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.crypto import encrypt_secret
from app.middleware.admin_auth import require_admin
from app.api.auth import get_current_user
from app.models import User
from app.models.llm_model import LLMModelConfig
from app.schemas.llm_model import (
    LLMModelConfigCreate,
    LLMModelConfigUpdate,
    LLMModelConfigResponse,
)

router = APIRouter(prefix="/api/admin/llm-models", tags=["admin-llm-models"])


def _to_response(config: LLMModelConfig) -> LLMModelConfigResponse:
    return LLMModelConfigResponse(
        id=config.id,
        name=config.name,
        provider=config.provider,
        role=config.role,
        model_name=config.model_name,
        config_json=config.config_json or {},
        has_api_key=bool(config.encrypted_api_key),
        is_active=config.is_active,
        created_by=config.created_by,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.get("", response_model=List[LLMModelConfigResponse])
async def list_llm_models(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all LLM model configs. Any authenticated user may list (read-only) so
    facilitators can see available options when assigning models to a workshop."""
    result = await db.execute(select(LLMModelConfig).order_by(LLMModelConfig.name))
    return [_to_response(c) for c in result.scalars().all()]


@router.post("", response_model=LLMModelConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_model(
    payload: LLMModelConfigCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = LLMModelConfig(
        name=payload.name,
        provider=payload.provider.value,
        role=payload.role.value,
        model_name=payload.model_name,
        config_json=payload.config_json,
        encrypted_api_key=encrypt_secret(payload.api_key) if payload.api_key else None,
        is_active=payload.is_active,
        created_by=admin.id,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return _to_response(config)


@router.put("/{model_id}", response_model=LLMModelConfigResponse)
async def update_llm_model(
    model_id: UUID,
    payload: LLMModelConfigUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMModelConfig).where(LLMModelConfig.id == model_id))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM model config not found")

    if payload.name is not None:
        config.name = payload.name
    if payload.provider is not None:
        config.provider = payload.provider.value
    if payload.role is not None:
        config.role = payload.role.value
    if payload.model_name is not None:
        config.model_name = payload.model_name
    if payload.config_json is not None:
        config.config_json = payload.config_json
    if payload.api_key is not None:
        config.encrypted_api_key = encrypt_secret(payload.api_key)
    if payload.is_active is not None:
        config.is_active = payload.is_active

    await db.commit()
    await db.refresh(config)
    return _to_response(config)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_llm_model(
    model_id: UUID,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(LLMModelConfig).where(LLMModelConfig.id == model_id))
    config = result.scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="LLM model config not found")
    await db.delete(config)
    await db.commit()
