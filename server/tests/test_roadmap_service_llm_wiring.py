"""
Tests that roadmap_service's LLM-calling methods resolve and use a
workshop's selected reasoning model when one is set, falling back otherwise.
"""
import uuid

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User, Workshop, UseCase
from app.models.llm_model import LLMModelConfig
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password
from app.core.crypto import encrypt_secret
from app.services.roadmap_service import RoadmapService


async def _make_user(db_session: AsyncSession) -> User:
    user = User(
        email=f"roadmap-wiring-test-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("pass12345"),
        full_name="Roadmap Wiring Test",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_workshop_and_use_case(db_session: AsyncSession, user: User) -> tuple:
    model_config = LLMModelConfig(
        name="Test Roadmap Reasoning Model",
        provider="openai",
        role="reasoning",
        model_name="gpt-4-roadmap-test",
        config_json={},
        encrypted_api_key=encrypt_secret("sk-test-fake-key"),
        is_active=True,
        created_by=user.id,
    )
    db_session.add(model_config)
    await db_session.commit()
    await db_session.refresh(model_config)

    workshop = Workshop(
        title="Roadmap Wiring Test Workshop",
        facilitator_id=user.id,
        pin=uuid.uuid4().hex[:6].upper(),
        config={"criteria": [], "reasoning_model_id": str(model_config.id)},
    )
    db_session.add(workshop)
    await db_session.commit()
    await db_session.refresh(workshop)

    use_case = UseCase(
        workshop_id=workshop.id,
        title="Test Use Case",
        description="A test use case for roadmap wiring",
    )
    db_session.add(use_case)
    await db_session.commit()
    await db_session.refresh(use_case)

    return workshop, use_case


class _FakeResponse:
    def __init__(self, content: str):
        self.content = content


def _make_service(content: str) -> RoadmapService:
    service = RoadmapService.__new__(RoadmapService)
    service.mock_mode = False
    service.llm = AsyncMock()
    service.llm.ainvoke = AsyncMock(return_value=_FakeResponse(content))
    return service


@pytest.mark.asyncio
async def test_analyze_complexity_uses_workshop_model(db_session: AsyncSession):
    user = await _make_user(db_session)
    _, use_case = await _make_workshop_and_use_case(db_session, user)
    service = _make_service('{"complexity_by_case": {}}')

    with patch("langchain_openai.ChatOpenAI.ainvoke", new=AsyncMock(return_value=_FakeResponse('{"complexity_by_case": {"workshop-model": {"score": 3}}}'))) as mock_workshop_llm:
        with patch("app.utils.llm_tracking.track_llm_usage", new=AsyncMock()):
            result = await service.analyze_complexity([use_case], db=db_session)

    mock_workshop_llm.assert_called_once()
    service.llm.ainvoke.assert_not_called()
    assert "workshop-model" in result["complexity_by_case"]


@pytest.mark.asyncio
async def test_analyze_complexity_falls_back_without_db(db_session: AsyncSession):
    user = await _make_user(db_session)
    _, use_case = await _make_workshop_and_use_case(db_session, user)
    service = _make_service('{"complexity_by_case": {"default": {"score": 4}}}')

    with patch("app.utils.llm_tracking.track_llm_usage", new=AsyncMock()):
        result = await service.analyze_complexity([use_case])

    service.llm.ainvoke.assert_called_once()
    assert "default" in result["complexity_by_case"]
