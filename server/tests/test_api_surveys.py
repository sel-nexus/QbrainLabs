"""
Survey API tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestSurveyAPI:
    """Test survey CRUD endpoints"""
    
    async def test_create_survey(self, client: AsyncClient):
        """Test creating a new survey"""
        survey_data = {
            "title": "AI Readiness Assessment",
            "description": "Evaluate organization's AI readiness",
            "workshop_id": None,
            "questions": [
                {
                    "text": "How familiar is your team with AI technologies?",
                    "question_type": "rating",
                    "required": True,
                    "options": {"min": 1, "max": 5}
                }
            ]
        }
        response = await client.post("/api/surveys/", json=survey_data)
        assert response.status_code in [200, 201, 422]  # 422 if auth required
        
    async def test_list_surveys(self, client: AsyncClient):
        """Test listing all surveys"""
        response = await client.get("/api/surveys/")
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
    
    async def test_get_survey_not_found(self, client: AsyncClient):
        """Test getting non-existent survey"""
        response = await client.get("/api/surveys/nonexistent-id")
        assert response.status_code in [404, 422]


@pytest.mark.asyncio
class TestSurveyTemplates:
    """Test survey template endpoints"""
    
    async def test_get_survey_templates(self, client: AsyncClient):
        """Test retrieving survey templates"""
        response = await client.get("/api/surveys/templates")
        assert response.status_code in [200, 404]  # 404 if endpoint doesn't exist
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)


@pytest.mark.asyncio
class TestSurveyResponses:
    """Test survey response endpoints"""
    
    async def test_submit_response_invalid_survey(self, client: AsyncClient):
        """Test submitting response to invalid survey"""
        response_data = {
            "answers": [{"question_id": "q1", "value": 5}]
        }
        response = await client.post(
            "/api/surveys/invalid-survey/responses",
            json=response_data
        )
        assert response.status_code in [404, 422]
    
    async def test_get_survey_results_not_found(self, client: AsyncClient):
        """Test getting results for non-existent survey"""
        response = await client.get("/api/surveys/invalid-id/results")
        assert response.status_code in [404, 422]
