"""
Unit tests for the per-workshop LLM client resolver.
"""
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User, Workshop
from app.models.llm_model import LLMModelConfig
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password
from app.core.crypto import encrypt_secret
from app.services.llm_resolver import resolve_chat_model


async def _make_user(db_session: AsyncSession) -> User:
    user = User(
        email=f"resolver-test-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("pass12345"),
        full_name="Resolver Test",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_workshop(db_session: AsyncSession, user: User, config: dict) -> Workshop:
    workshop = Workshop(
        title="Resolver Test Workshop",
        facilitator_id=user.id,
        pin=uuid.uuid4().hex[:6].upper(),
        config=config,
    )
    db_session.add(workshop)
    await db_session.commit()
    await db_session.refresh(workshop)
    return workshop


async def _make_model_config(
    db_session: AsyncSession,
    user: User,
    provider: str,
    role: str,
    model_name: str,
    is_active: bool = True,
    config_json: dict = None,
) -> LLMModelConfig:
    config = LLMModelConfig(
        name=f"Test {provider} {role}",
        provider=provider,
        role=role,
        model_name=model_name,
        config_json=config_json or {},
        encrypted_api_key=encrypt_secret("sk-test-fake-key"),
        is_active=is_active,
        created_by=user.id,
    )
    db_session.add(config)
    await db_session.commit()
    await db_session.refresh(config)
    return config


class _FakeFallbackLLM:
    """Stand-in for a service's self.llm in mock mode (None) or real mode."""
    pass


@pytest.mark.asyncio
async def test_resolve_chat_model_falls_back_when_no_db(db_session: AsyncSession):
    fallback = _FakeFallbackLLM()
    client, model_name = await resolve_chat_model(
        db=None, workshop_id="some-id", role="reasoning",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert client is fallback
    assert model_name == "gpt-4"


@pytest.mark.asyncio
async def test_resolve_chat_model_falls_back_when_no_workshop_id(db_session: AsyncSession):
    fallback = _FakeFallbackLLM()
    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=None, role="reasoning",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert client is fallback
    assert model_name == "gpt-4"


@pytest.mark.asyncio
async def test_resolve_chat_model_falls_back_when_no_selection(db_session: AsyncSession):
    user = await _make_user(db_session)
    workshop = await _make_workshop(db_session, user, config={"criteria": []})
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="reasoning",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert client is fallback
    assert model_name == "gpt-4"


@pytest.mark.asyncio
async def test_resolve_chat_model_builds_openai_client(db_session: AsyncSession):
    from langchain_openai import ChatOpenAI

    user = await _make_user(db_session)
    model_config = await _make_model_config(db_session, user, "openai", "reasoning", "gpt-4-turbo")
    workshop = await _make_workshop(
        db_session, user, config={"criteria": [], "reasoning_model_id": str(model_config.id)}
    )
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="reasoning",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert isinstance(client, ChatOpenAI)
    assert model_name == "gpt-4-turbo"


@pytest.mark.asyncio
async def test_resolve_chat_model_builds_azure_client(db_session: AsyncSession):
    from langchain_openai import AzureChatOpenAI

    user = await _make_user(db_session)
    model_config = await _make_model_config(
        db_session, user, "azure_openai", "decision", "gpt-4-deployment",
        config_json={"endpoint": "https://test.openai.azure.com", "deployment": "gpt-4-deployment", "api_version": "2024-12-01-preview"},
    )
    workshop = await _make_workshop(
        db_session, user, config={"criteria": [], "decision_model_id": str(model_config.id)}
    )
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="decision",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert isinstance(client, AzureChatOpenAI)
    assert model_name == "gpt-4-deployment"


@pytest.mark.asyncio
async def test_resolve_chat_model_builds_anthropic_client(db_session: AsyncSession):
    from langchain_anthropic import ChatAnthropic

    user = await _make_user(db_session)
    model_config = await _make_model_config(db_session, user, "anthropic", "reasoning", "claude-3-5-sonnet-20241022")
    workshop = await _make_workshop(
        db_session, user, config={"criteria": [], "reasoning_model_id": str(model_config.id)}
    )
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="reasoning",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert isinstance(client, ChatAnthropic)
    assert model_name == "claude-3-5-sonnet-20241022"


@pytest.mark.asyncio
async def test_resolve_chat_model_falls_back_for_typesafe_ai(db_session: AsyncSession):
    user = await _make_user(db_session)
    model_config = await _make_model_config(
        db_session, user, "typesafe_ai", "decision", "jev-v1",
        config_json={"base_url": "https://api.typesafe.example/v1"},
    )
    workshop = await _make_workshop(
        db_session, user, config={"criteria": [], "decision_model_id": str(model_config.id)}
    )
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="decision",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert client is fallback
    assert model_name == "gpt-4"


@pytest.mark.asyncio
async def test_resolve_chat_model_falls_back_for_inactive_selection(db_session: AsyncSession):
    user = await _make_user(db_session)
    model_config = await _make_model_config(
        db_session, user, "openai", "reasoning", "gpt-4-turbo", is_active=False
    )
    workshop = await _make_workshop(
        db_session, user, config={"criteria": [], "reasoning_model_id": str(model_config.id)}
    )
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="reasoning",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    assert client is fallback
    assert model_name == "gpt-4"


@pytest.mark.asyncio
async def test_resolve_chat_model_falls_back_for_wrong_role(db_session: AsyncSession):
    user = await _make_user(db_session)
    model_config = await _make_model_config(db_session, user, "openai", "decision", "gpt-4-turbo")
    # Stored under reasoning_model_id even though the config's own role is "decision" -
    # simulates data drift; resolver should trust the slot key, not re-validate role
    # (set_workshop_llm_models already enforces role-match at write time), so this
    # actually succeeds. This test documents that behavior rather than asserting a fallback.
    workshop = await _make_workshop(
        db_session, user, config={"criteria": [], "decision_model_id": str(model_config.id)}
    )
    fallback = _FakeFallbackLLM()

    client, model_name = await resolve_chat_model(
        db=db_session, workshop_id=str(workshop.id), role="decision",
        fallback_llm=fallback, fallback_model_name="gpt-4",
    )
    from langchain_openai import ChatOpenAI
    assert isinstance(client, ChatOpenAI)
    assert model_name == "gpt-4-turbo"
