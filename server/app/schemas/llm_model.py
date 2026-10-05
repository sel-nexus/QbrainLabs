from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.llm_model import LLMProvider, LLMRole


class LLMModelConfigCreate(BaseModel):
    name: str
    provider: LLMProvider
    role: LLMRole
    model_name: str
    config_json: dict = {}
    api_key: Optional[str] = None
    is_active: bool = True


class LLMModelConfigUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[LLMProvider] = None
    role: Optional[LLMRole] = None
    model_name: Optional[str] = None
    config_json: Optional[dict] = None
    api_key: Optional[str] = None
    is_active: Optional[bool] = None


class LLMModelConfigResponse(BaseModel):
    id: UUID
    name: str
    provider: LLMProvider
    role: LLMRole
    model_name: str
    config_json: dict
    has_api_key: bool
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
