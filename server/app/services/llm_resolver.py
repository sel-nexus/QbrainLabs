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
    the selection is a typesafe_ai config (no client built yet - separate
    follow-up), or if building the selected client fails for any reason.
    Never raises.
    """
    if db is None or not workshop_id:
        return fallback_llm, fallback_model_name

    try:
        result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
        workshop = result.scalars().first()
        if not workshop or not workshop.config:
            return fallback_llm, fallback_model_name

        model_id = workshop.config.get(f"{role}_model_id")
        if not model_id:
            return fallback_llm, fallback_model_name

        config_result = await db.execute(
            select(LLMModelConfig).where(
                LLMModelConfig.id == model_id,
                LLMModelConfig.is_active == True,
            )
        )
        config = config_result.scalars().first()
        if not config:
            return fallback_llm, fallback_model_name

        if config.provider == "typesafe_ai":
            logger.warning(
                "llm_resolver_typesafe_ai_not_yet_supported",
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
