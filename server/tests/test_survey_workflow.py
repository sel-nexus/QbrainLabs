import pytest
from httpx import AsyncClient
import uuid
from app.api.auth import get_current_user
from app.models import User, Workshop, Participant, Survey
from app.main import app

# Mock Data
MOCK_USER_ID = str(uuid.uuid4())
MOCK_WORKSHOP_ID = str(uuid.uuid4())
MOCK_PARTICIPANT_ID = str(uuid.uuid4())

async def mock_get_current_user():
    return User(id=MOCK_USER_ID, email="facilitator@test.com", is_admin=False)

@pytest.mark.asyncio
async def test_survey_full_lifestyle(client: AsyncClient, db_session):
    # 1. Setup Data
    # Create Facilitator
    user = User(
        id=MOCK_USER_ID,
        email="facilitator@test.com",
        password_hash="hashed_secret",
        full_name="Facilitator",
        role="facilitator",
        is_admin=False
    )
    user.status = "active"

    db_session.add(user)
    
    # Create Workshop
    workshop = Workshop(
        id=MOCK_WORKSHOP_ID,
        title="Test Survey Workshop",
        facilitator_id=MOCK_USER_ID
    )
    workshop.status = "active"
    db_session.add(workshop)
    
    # Create Participant
    participant = Participant(
        id=MOCK_PARTICIPANT_ID,
        workshop_id=MOCK_WORKSHOP_ID,
        display_name="Test Participant"
    )
    participant.status = "active"
    db_session.add(participant)
    
    await db_session.commit()
    
    # Override Auth Dependency
    app.dependency_overrides[get_current_user] = mock_get_current_user
    
    try:
        # 2. Create Survey (Facilitator)
        survey_data = {
            "title": "Feedback Survey",
            "description": "Please provide feedback",
            "questions": [
                {
                    "text": "How was the workshop?",
                    "type": "rating",
                    "required": True,
                    "order": 1,
                    "config": {"min": 1, "max": 5}
                },
                {
                    "text": "Any comments?",
                    "type": "text",
                    "required": False,
                    "order": 2
                }
            ],
            "settings": {
                "anonymous": False
            }
        }
        
        response = await client.post(f"/api/surveys/workshop/{MOCK_WORKSHOP_ID}", json=survey_data)
        assert response.status_code == 200, f"Create Survey Failed: {response.text}"
        survey = response.json()
        survey_id = survey["id"]
        assert survey["title"] == "Feedback Survey"
        assert len(survey["questions"]) == 2
        q1_id = next(q["id"] for q in survey["questions"] if q["type"] == "rating")
        q2_id = next(q["id"] for q in survey["questions"] if q["type"] == "text")
        
        # 3. List Surveys (Facilitator)
        response = await client.get(f"/api/surveys/workshop/{MOCK_WORKSHOP_ID}")
        assert response.status_code == 200
        surveys_list = response.json()["surveys"]
        assert len(surveys_list) == 1
        assert surveys_list[0]["id"] == survey_id
        assert surveys_list[0]["status"] == "DRAFT"
        
        # 4. Activate Survey (Facilitator)
        response = await client.post(f"/api/surveys/{survey_id}/activate")
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 5. Get Survey (Participant)
        # Verify participant can see it
        response = await client.get(f"/api/surveys/{survey_id}/participant?participant_id={MOCK_PARTICIPANT_ID}")
        assert response.status_code == 200
        p_survey = response.json()
        assert p_survey["title"] == "Feedback Survey"
        assert len(p_survey["questions"]) == 2
        
        # 6. Submit Response (Participant)
        submission_data = {
            "answers": [
                {"question_id": q1_id, "value": 5},
                {"question_id": q2_id, "value": "Great session!"}
            ]
        }
        response = await client.post(
            f"/api/surveys/{survey_id}/submit?participant_id={MOCK_PARTICIPANT_ID}", 
            json=submission_data
        )
        assert response.status_code == 200
        assert response.json()["success"] is True
        
        # 7. Check Results (Facilitator)
        response = await client.get(f"/api/surveys/{survey_id}/results")
        assert response.status_code == 200
        results = response.json()
        assert results["total_responses"] == 1
        
        # Verify question stats
        q1_stats = next(q for q in results["questions"] if q["question_id"] == q1_id)
        assert q1_stats["average"] == 5.0
        
        q2_stats = next(q for q in results["questions"] if q["question_id"] == q2_id)
        assert len(q2_stats["responses"]) == 1
        assert q2_stats["responses"][0] == "Great session!"
        
        print("\nSurvey Workflow Test Passed Successfully!")
        
    finally:
        # Cleanup overrides
        app.dependency_overrides.clear()
