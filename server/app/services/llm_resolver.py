"""
Per-workshop LLM client resolution.

Given a workshop and a role ("decision" | "reasoning"), returns the
workshop's selected LangChain chat client if one is active and configured,
otherwise falls back to the caller's existing default client unchanged.
This is the single integration point between the Phase 1 LLM model
registry and the services that actually make LLM calls.
"""
from typing import Any, Optional, Tuple

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.crypto import decrypt_secret
from app.models.llm_model import LLMModelConfig
from app.models.models import Workshop
from app.services.typesafe_client import JevConfig

logger = structlog.get_logger(__name__)


def _build_client(config: LLMModelConfig) -> Any:
    api_key = decrypt_secret(config.encrypted_api_key) if config.encrypted_api_key else None
    extra = config.config_json or {}

    if config.provider == "azure_openai":
        from langchain_openai import AzureChatOpenAI
        return AzureChatOpenAI(
            azure_endpoint=extra.get("endpoint"),
            azure_deployment=extra.get("deployment"),
            api_version=extra.get("api_version"),
            api_key=api_key,
            model=config.model_name,
        )
    if config.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=config.model_name, api_key=api_key)

    # Default: openai
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(model=config.model_name, api_key=api_key)


async def _selected_config(db: AsyncSession, workshop_id: str, role: str) -> Optional[LLMModelConfig]:
    """The workshop's active registry entry for `role`, if any."""
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    model_id = (workshop.config or {}).get(f"{role}_model_id") if workshop else None
    if not model_id:
        return None
    config_result = await db.execute(
        select(LLMModelConfig).where(LLMModelConfig.id == model_id, LLMModelConfig.is_active == True)
    )
    return config_result.scalars().first()


async def resolve_jev_model(db: Optional[AsyncSession], workshop_id: Optional[str]) -> Optional[JevConfig]:
    """The workshop's Typesafe AI (Jev) decision model, or None. Never raises."""
    if db is None or not workshop_id:
        return None
    try:
        config = await _selected_config(db, workshop_id, "decision")
        if not config or config.provider != "typesafe_ai" or not config.encrypted_api_key:
            return None
        return JevConfig(
            base_url=(config.config_json or {}).get("base_url") or "",
            api_key=decrypt_secret(config.encrypted_api_key),
            model=config.model_name,
            config_id=str(config.id),
        )
    except Exception as e:
        logger.warning("llm_resolver_jev_failed", workshop_id=workshop_id, error=str(e))
        return None


async def resolve_chat_model(
    db: Optional[AsyncSession],
    workshop_id: Optional[str],
    role: str,
    fallback_llm: Any,
    fallback_model_name: str,
) -> Tuple[Any, str]:
    """Resolve the LLM client to use for one call.

    Returns (fallback_llm, fallback_model_name) unchanged if workshop_id or
    db is missing, if the workshop has no active selection for this role, if
    the selection is a typesafe_ai config (Jev is not a chat model; see
    resolve_jev_model), or if building the selected client fails for any reason.
    Never raises.
    """
    if db is None or not workshop_id:
        return fallback_llm, fallback_model_name

    try:
        config = await _selected_config(db, workshop_id, role)
        if not config:
            return fallback_llm, fallback_model_name

        if config.provider == "typesafe_ai":
            # Jev answers typed questions, it can't write text: callers that
            # support it use resolve_jev_model() instead.
            logger.info(
                "llm_resolver_typesafe_ai_not_a_chat_model",
                config_id=str(config.id),
                workshop_id=workshop_id,
            )
            return fallback_llm, fallback_model_name

        client = _build_client(config)
        return client, config.model_name
    except Exception as e:
        logger.warning(
            "llm_resolver_failed_falling_back",
            workshop_id=workshop_id,
            role=role,
            error=str(e),
        )
        return fallback_llm, fallback_model_name
