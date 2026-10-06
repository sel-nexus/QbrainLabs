"""
Survey API tests against the current routes (/api/surveys/...): all
facilitator survey endpoints require sign-in.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers_for


@pytest.mark.asyncio
class TestSurveyAuth:
    async def test_list_workshop_surveys_requires_auth(self, client: AsyncClient):
        response = await client.get("/api/surveys/workshop/some-workshop")
        assert response.status_code == 401

    async def test_create_survey_requires_auth(self, client: AsyncClient):
        response = await client.post("/api/surveys/workshop/some-workshop", json={"title": "AI Readiness"})
        assert response.status_code in (401, 422)

    async def test_results_require_auth(self, client: AsyncClient):
        response = await client.get("/api/surveys/invalid-id/results")
        assert response.status_code == 401

    async def test_templates_require_auth(self, client: AsyncClient):
        response = await client.get("/api/surveys/templates/list")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestSurveyAPI:
    async def test_survey_not_found(self, client: AsyncClient, make_user):
        headers = auth_headers_for(await make_user())
        response = await client.get("/api/surveys/00000000-0000-0000-0000-000000000000", headers=headers)
        assert response.status_code == 404

    async def test_results_not_found(self, client: AsyncClient, make_user):
        headers = auth_headers_for(await make_user())
        response = await client.get("/api/surveys/00000000-0000-0000-0000-000000000000/results", headers=headers)
        assert response.status_code == 404

    async def test_list_templates(self, client: AsyncClient, make_user):
        response = await client.get("/api/surveys/templates/list", headers=auth_headers_for(await make_user()))
        assert response.status_code == 200
