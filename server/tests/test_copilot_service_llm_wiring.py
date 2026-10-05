"""
Tests that copilot_service's LLM-calling private helpers resolve and use a
workshop's selected model when one is set, falling back otherwise.
"""
import uuid

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import User, Workshop, Participant, Vote
from app.models.llm_model import LLMModelConfig
from app.models.rbac import UserRole, AccountStatus
from app.api.auth import hash_password
from app.core.crypto import encrypt_secret
from app.services.copilot_service import CopilotService


async def _make_user(db_session: AsyncSession) -> User:
    user = User(
        email=f"copilot-wiring-test-{uuid.uuid4().hex[:8]}@test.com",
        password_hash=hash_password("pass12345"),
        full_name="Copilot Wiring Test",
        role=UserRole.ADMIN,
        status=AccountStatus.ACTIVE,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _make_workshop_with_model(db_session: AsyncSession, user: User, role: str) -> tuple:
    model_config = LLMModelConfig(
        name=f"Test {role} Model",
        provider="openai",
        role=role,
        model_name="gpt-4-copilot-test",
        config_json={},
        encrypted_api_key=encrypt_secret("sk-test-fake-key"),
        is_active=True,
        created_by=user.id,
    )
    db_session.add(model_config)
    await db_session.commit()
    await db_session.refresh(model_config)

    workshop = Workshop(
        title="Copilot Wiring Test Workshop",
        facilitator_id=user.id,
        pin=uuid.uuid4().hex[:6].upper(),
        current_phase="INTAKE",
        config={"criteria": [], f"{role}_model_id": str(model_config.id)},
    )
    db_session.add(workshop)
    await db_session.commit()
    await db_session.refresh(workshop)
    return workshop, model_config


class _FakeResponse:
    def __init__(self, content: str):
        self.content = content


def _make_service(content: str) -> CopilotService:
    service = CopilotService.__new__(CopilotService)
    service.mock_mode = False
    service.llm = AsyncMock()
    service.llm.ainvoke = AsyncMock(return_value=_FakeResponse(content))
    return service


@pytest.mark.asyncio
async def test_generate_ai_suggestions_uses_workshop_model(db_session: AsyncSession):
    user = await _make_user(db_session)
    workshop, _ = await _make_workshop_with_model(db_session, user, "reasoning")
    service = _make_service('{"type": "FACILITATION", "message": "default-model response", "priority": "LOW", "actions": []}')

    with patch("langchain_openai.ChatOpenAI.ainvoke", new=AsyncMock(return_value=_FakeResponse('{"type": "FACILITATION", "message": "workshop-model response", "priority": "LOW", "actions": []}'))):
        with patch("app.services.copilot_service.track_llm_usage", new=AsyncMock()) as mock_track:
            result = await service._generate_ai_suggestions(
                workshop=workshop, participants=[], use_cases=[], votes=[], phase="INTAKE", db=db_session
            )

    assert len(result) == 1
    assert result[0]["message"] == "workshop-model response"
    service.llm.ainvoke.assert_not_called()
    assert mock_track.call_args.kwargs["model_name"] == "gpt-4-copilot-test"


@pytest.mark.asyncio
async def test_generate_ai_suggestions_falls_back_without_db(db_session: AsyncSession):
    user = await _make_user(db_session)
    workshop, _ = await _make_workshop_with_model(db_session, user, "reasoning")
    service = _make_service('{"type": "FACILITATION", "message": "default-model response", "priority": "LOW", "actions": []}')

    with patch("app.services.copilot_service.track_llm_usage", new=AsyncMock()):
        result = await service._generate_ai_suggestions(
            workshop=workshop, participants=[], use_cases=[], votes=[], phase="INTAKE"
        )

    assert len(result) == 1
    assert result[0]["message"] == "default-model response"
    service.llm.ainvoke.assert_called_once()


@pytest.mark.asyncio
async def test_detect_groupthink_and_bias_uses_workshop_model(db_session: AsyncSession):
    user = await _make_user(db_session)
    workshop, _ = await _make_workshop_with_model(db_session, user, "decision")
    service = _make_service("[]")

    participants = [
        Participant(workshop_id=workshop.id, display_name=f"P{i}", role="PARTICIPANT")
        for i in range(3)
    ]
    for p in participants:
        db_session.add(p)
    await db_session.commit()

    votes = []
    for p in participants:
        v = Vote(participant_id=p.id, use_case_id=workshop.id, scores={"Feasibility": 5})
        db_session.add(v)
        votes.append(v)
    await db_session.commit()

    with patch("langchain_openai.ChatOpenAI.ainvoke", new=AsyncMock(return_value=_FakeResponse("[]"))) as mock_workshop_llm:
        with patch("app.services.copilot_service.track_llm_usage", new=AsyncMock()):
            await service._detect_groupthink_and_bias(
                participants=participants, votes=votes, workshop_id=str(workshop.id), db=db_session
            )

    mock_workshop_llm.assert_called_once()
    service.llm.ainvoke.assert_not_called()
