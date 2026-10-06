"""
Typesafe AI (Jev) as a workshop's decision model: the HTTP client, resolver
selection, feasibility checks and group voting-anomaly detection.
"""
import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services import typesafe_client
from app.services.llm_resolver import resolve_chat_model, resolve_jev_model
from app.services.typesafe_client import JevConfig, TypesafeError, endpoint_url, model_id, system_one
from tests.test_llm_resolver import _make_model_config, _make_user, _make_workshop

JEV = JevConfig(base_url="https://api.typesafe.ai/v1/systemone", api_key="sk-test", model="JEV", config_id="cfg-1")


# --- client ------------------------------------------------------------------

def test_endpoint_and_model_normalisation():
    assert endpoint_url("https://api.typesafe.ai") == "https://api.typesafe.ai/v1/systemone"
    assert endpoint_url("https://api.typesafe.ai/v1/systemone/") == "https://api.typesafe.ai/v1/systemone"
    assert endpoint_url(None) == "https://api.typesafe.ai/v1/systemone"
    assert model_id("JEV") == "jev-latest"
    assert model_id("jev-1.13.0") == "jev-1.13.0"


@pytest.mark.asyncio
async def test_system_one_sends_model_state_questions_and_bearer_key():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["Authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={
            "model": "jev-1.13.0",
            "answers": {"q": {"choice": "High", "confidence": 0.9}},
            "usage": {"input_tokens": 120, "output_tokens": 4},
        })

    questions = {"q": {"type": "choice", "instructions": "x", "criteria": {"High": "h", "Low": "l"}}}
    data = await system_one(JEV, {"a": 1}, questions, transport=httpx.MockTransport(handler))

    assert seen["url"] == "https://api.typesafe.ai/v1/systemone"
    assert seen["auth"] == "Bearer sk-test"
    assert seen["body"] == {"model": "jev-latest", "state": {"a": 1}, "questions": questions}
    assert data["answers"]["q"]["choice"] == "High"
    assert typesafe_client.usage_tokens(data) == {"prompt": 120, "completion": 4}


@pytest.mark.asyncio
async def test_system_one_raises_on_http_error():
    transport = httpx.MockTransport(lambda request: httpx.Response(429, text="rate limited"))
    with pytest.raises(TypesafeError, match="429"):
        await system_one(JEV, "state", {}, transport=transport)


# --- resolver ----------------------------------------------------------------

@pytest.mark.asyncio
async def test_resolve_jev_model_returns_selected_typesafe_decision_model(db_session: AsyncSession):
    user = await _make_user(db_session)
    config = await _make_model_config(db_session, user, "typesafe_ai", "decision", "JEV",
                                      config_json={"base_url": "https://api.typesafe.ai/v1/systemone"})
    workshop = await _make_workshop(db_session, user, {"decision_model_id": str(config.id)})

    jev = await resolve_jev_model(db_session, str(workshop.id))
    assert jev is not None
    assert jev.api_key == "sk-test-fake-key"
    assert jev.base_url == "https://api.typesafe.ai/v1/systemone"

    # Chat callers still fall back: Jev cannot write text.
    fallback = object()
    llm, name = await resolve_chat_model(db_session, str(workshop.id), "decision", fallback, "default")
    assert llm is fallback and name == "default"


@pytest.mark.asyncio
async def test_resolve_jev_model_ignores_other_providers_and_inactive(db_session: AsyncSession):
    user = await _make_user(db_session)
    openai_cfg = await _make_model_config(db_session, user, "openai", "decision", "gpt-4o")
    inactive = await _make_model_config(db_session, user, "typesafe_ai", "decision", "JEV", is_active=False)
    for cfg in (openai_cfg, inactive):
        workshop = await _make_workshop(db_session, user, {"decision_model_id": str(cfg.id)})
        assert await resolve_jev_model(db_session, str(workshop.id)) is None
    assert await resolve_jev_model(db_session, None) is None


# --- feasibility -------------------------------------------------------------

@pytest.mark.asyncio
async def test_feasibility_uses_jev_even_in_mock_mode():
    from app.services.rag_service import rag_service

    jev_answer = {"model": "jev-1.13.0", "answers": {"feasibility": {"choice": "Medium", "confidence": 0.81}},
                  "usage": {"input_tokens": 50, "output_tokens": 2}}
    with patch("app.services.llm_resolver.resolve_jev_model", AsyncMock(return_value=JEV)), \
         patch("app.services.typesafe_client.system_one", AsyncMock(return_value=jev_answer)) as call, \
         patch("app.services.rag_service.track_llm_usage", AsyncMock()) as track, \
         patch.object(rag_service, "mock_mode", True):
        result = await rag_service.check_feasibility("Summarise tickets", workshop_id="ws-1", db=object())

    assert result["score"] == "Medium"
    assert "81%" in result["reason"]
    assert result["is_mock"] is False
    assert call.await_args.args[2]["feasibility"]["type"] == "choice"
    assert track.await_args.kwargs["model_name"] == "jev-1.13.0"


@pytest.mark.asyncio
async def test_feasibility_falls_back_when_jev_fails():
    from app.services.rag_service import rag_service

    with patch("app.services.llm_resolver.resolve_jev_model", AsyncMock(return_value=JEV)), \
         patch("app.services.typesafe_client.system_one", AsyncMock(side_effect=TypesafeError("down"))), \
         patch.object(rag_service, "mock_mode", True):
        result = await rag_service.check_feasibility("Summarise tickets", workshop_id="ws-1", db=object())

    assert result["is_mock"] is True  # fell back to the existing (mock) path


# --- group voting anomalies --------------------------------------------------

def _participants_and_votes(n_people=4, votes_each=3):
    people = [SimpleNamespace(id=uuid.uuid4(), display_name=f"P{i}", role="PARTICIPANT") for i in range(n_people)]
    votes = [SimpleNamespace(participant_id=p.id, scores={"Feasibility": 7, "Business Value": 7})
             for p in people for _ in range(votes_each)]
    return people, votes


@pytest.mark.asyncio
async def test_groupthink_reported_from_jev_probabilities():
    from app.services.copilot_service import CopilotService

    service = CopilotService()
    people, votes = _participants_and_votes()
    answer = {"model": "jev-1.13.0", "usage": {"input_tokens": 80, "output_tokens": 3},
              "answers": {"groupthink": {"noul": 0.92}, "systematic_bias": {"noul": 0.2}, "polarization": {"noul": 0.65}}}
    with patch("app.services.typesafe_client.system_one", AsyncMock(return_value=answer)) as call, \
         patch("app.services.copilot_service.track_llm_usage", AsyncMock()):
        anomalies = await service._jev_groupthink_and_bias(JEV, people, votes, workshop_id="ws-1")

    assert {a["type"] for a in anomalies} == {"groupthink", "polarization"}
    severities = {a["type"]: a["severity"] for a in anomalies}
    assert severities["groupthink"] == "critical" and severities["polarization"] == "warning"
    assert all(q["type"] == "noul" for q in call.await_args.args[2].values())


@pytest.mark.asyncio
async def test_detect_voting_anomalies_uses_jev_when_selected():
    from app.services.copilot_service import CopilotService

    service = CopilotService()
    people, votes = _participants_and_votes()
    jev_result = [{"type": "groupthink", "severity": "high", "details": {}, "explanation": "", "recommendation": ""}]
    with patch("app.services.llm_resolver.resolve_jev_model", AsyncMock(return_value=JEV)), \
         patch.object(service, "_jev_groupthink_and_bias", AsyncMock(return_value=jev_result)), \
         patch.object(service, "_detect_groupthink_and_bias", AsyncMock()) as llm_path:
        anomalies = await service._detect_voting_anomalies(people, votes, workshop_id="ws-1", db=object())

    assert jev_result[0] in anomalies
    llm_path.assert_not_awaited()
