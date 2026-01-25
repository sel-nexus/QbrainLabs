"""
API Integration tests for US16: AI Copilot Assistant
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import uuid

from app.models.models import (
    User, Workshop, Participant, UseCase, Vote,
    CopilotSettings, CopilotSuggestion, ParticipantEngagement,
    WorkshopSummary, DetectedAnomaly, AccountStatus, UserRole
)


@pytest.fixture
async def test_user(db_session: AsyncSession):
    """Create a test facilitator user"""
    user = User(
        id=uuid.uuid4(),
        email="facilitator@test.com",
        password_hash="hashed_password",
        full_name="Test Facilitator",
        role=UserRole.FACILITATOR.value,
        status=AccountStatus.ACTIVE.value,
        is_admin=False
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def test_workshop(db_session: AsyncSession, test_user):
    """Create a test workshop"""
    workshop = Workshop(
        id=uuid.uuid4(),
        facilitator_id=test_user.id,
        title="Test Copilot Workshop",
        pin="123456",
        status="OPEN",
        current_phase="INTAKE"
    )
    db_session.add(workshop)
    await db_session.commit()
    await db_session.refresh(workshop)
    return workshop


@pytest.fixture
async def test_participants(db_session: AsyncSession, test_workshop):
    """Create test participants"""
    participants = []
    for i in range(5):
        p = Participant(
            id=uuid.uuid4(),
            workshop_id=test_workshop.id,
            display_name=f"Participant {i+1}",
            role="PARTICIPANT"
        )
        db_session.add(p)
        participants.append(p)
    await db_session.commit()
    return participants


@pytest.fixture
async def test_use_cases(db_session: AsyncSession, test_workshop, test_participants):
    """Create test use cases"""
    use_cases = []
    titles = ["AI Invoice Processing", "Customer Support Bot", "Predictive Analytics"]
    for i, title in enumerate(titles):
        uc = UseCase(
            id=uuid.uuid4(),
            workshop_id=test_workshop.id,
            participant_id=test_participants[i % len(test_participants)].id,
            title=title,
            description=f"Description for {title}",
            proposed_solution=f"Solution for {title}",
            kpi="Reduce time by 50%"
        )
        db_session.add(uc)
        use_cases.append(uc)
    await db_session.commit()
    return use_cases


@pytest.fixture
async def test_votes(db_session: AsyncSession, test_use_cases, test_participants):
    """Create test votes"""
    votes = []
    for uc in test_use_cases:
        for p in test_participants[:3]:
            v = Vote(
                id=uuid.uuid4(),
                use_case_id=uc.id,
                participant_id=p.id,
                scores={"Feasibility": 7, "Business Value": 8}
            )
            db_session.add(v)
            votes.append(v)
    await db_session.commit()
    return votes


@pytest.fixture
def auth_token_header(test_user):
    """Generate auth token header for test user"""
    # In real tests, generate a proper JWT token
    # For now, we'll skip auth in tests or mock it
    return {"Authorization": f"Bearer test_token_{test_user.id}"}


@pytest.mark.asyncio
class TestCopilotSuggestionsAPI:
    """Test copilot suggestions endpoints"""
    
    async def test_get_suggestions_unauthorized(self, client: AsyncClient, test_workshop):
        """Test that suggestions endpoint requires authentication"""
        response = await client.post(
            "/api/copilot/suggestions",
            json={"workshop_id": str(test_workshop.id)}
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]  # Auth required or validation error
    
    async def test_dismiss_suggestion_structure(self, client: AsyncClient):
        """Test dismiss suggestion request structure"""
        response = await client.post(
            "/api/copilot/suggestions/dismiss",
            json={
                "suggestion_id": str(uuid.uuid4()),
                "action": "dismiss"
            }
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]


@pytest.mark.asyncio
class TestCopilotEngagementAPI:
    """Test engagement monitoring endpoints"""
    
    async def test_get_engagement_endpoint_exists(self, client: AsyncClient, test_workshop):
        """Test that engagement endpoint exists"""
        response = await client.get(
            f"/api/copilot/engagement/{test_workshop.id}"
        )
        # Should require auth, not 404
        assert response.status_code != 404


@pytest.mark.asyncio
class TestCopilotVarianceAPI:
    """Test variance analysis endpoints"""
    
    async def test_analyze_variance_structure(self, client: AsyncClient, test_workshop, test_use_cases):
        """Test variance analysis request structure"""
        response = await client.post(
            "/api/copilot/analyze-variance",
            json={
                "use_case_id": str(test_use_cases[0].id),
                "workshop_id": str(test_workshop.id)
            }
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]


@pytest.mark.asyncio
class TestCopilotDiscussionPromptsAPI:
    """Test discussion prompts endpoints"""
    
    async def test_get_prompts_endpoint_exists(self, client: AsyncClient, test_use_cases):
        """Test that discussion prompts endpoint exists"""
        response = await client.get(
            f"/api/copilot/discussion-prompts/{test_use_cases[0].id}"
        )
        # Should require auth, not 404
        assert response.status_code != 404


@pytest.mark.asyncio
class TestCopilotEnhanceContentAPI:
    """Test content enhancement endpoints"""
    
    async def test_enhance_content_structure(self, client: AsyncClient):
        """Test enhance content request structure"""
        response = await client.post(
            "/api/copilot/enhance-content",
            json={
                "content": {
                    "title": "AI Chatbot",
                    "description": "A chatbot for support",
                    "kpi": "Reduce time"
                }
            }
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]


@pytest.mark.asyncio
class TestCopilotSummaryAPI:
    """Test summary generation endpoints"""
    
    async def test_generate_summary_structure(self, client: AsyncClient, test_workshop):
        """Test generate summary request structure"""
        response = await client.post(
            "/api/copilot/generate-summary",
            json={
                "workshop_id": str(test_workshop.id),
                "format": "executive"
            }
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]


@pytest.mark.asyncio
class TestCopilotAnomalyAPI:
    """Test anomaly detection endpoints"""
    
    async def test_detect_anomalies_structure(self, client: AsyncClient, test_workshop):
        """Test detect anomalies request structure"""
        response = await client.post(
            "/api/copilot/detect-anomalies",
            json={
                "workshop_id": str(test_workshop.id),
                "data_type": "all"
            }
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]


@pytest.mark.asyncio
class TestCopilotSettingsAPI:
    """Test copilot settings endpoints"""
    
    async def test_get_settings_endpoint_exists(self, client: AsyncClient, test_workshop):
        """Test that settings endpoint exists"""
        response = await client.get(
            f"/api/copilot/settings/{test_workshop.id}"
        )
        # Should require auth, not 404
        assert response.status_code != 404
    
    async def test_update_settings_structure(self, client: AsyncClient, test_workshop):
        """Test update settings request structure"""
        response = await client.put(
            f"/api/copilot/settings/{test_workshop.id}",
            json={
                "workshop_id": str(test_workshop.id),
                "mode": "proactive"
            }
        )
        # Should require auth
        assert response.status_code in [401, 403, 422]


@pytest.mark.asyncio
class TestCopilotModels:
    """Test that copilot database models are created correctly"""
    
    async def test_create_copilot_suggestion(self, db_session: AsyncSession, test_workshop):
        """Test creating a copilot suggestion"""
        suggestion = CopilotSuggestion(
            id=uuid.uuid4(),
            workshop_id=test_workshop.id,
            suggestion_type="engagement",
            message="Test suggestion",
            priority="medium",
            context={"test": True},
            actions=[{"label": "Test", "action": "test"}],
            status="pending"
        )
        db_session.add(suggestion)
        await db_session.commit()
        await db_session.refresh(suggestion)
        
        assert suggestion.id is not None
        assert suggestion.message == "Test suggestion"
    
    async def test_create_participant_engagement(self, db_session: AsyncSession, test_workshop, test_participants):
        """Test creating participant engagement record"""
        engagement = ParticipantEngagement(
            id=uuid.uuid4(),
            participant_id=test_participants[0].id,
            workshop_id=test_workshop.id,
            engagement_score="75.5",
            total_votes="10",
            total_submissions="2"
        )
        db_session.add(engagement)
        await db_session.commit()
        await db_session.refresh(engagement)
        
        assert engagement.id is not None
        assert engagement.engagement_score == "75.5"
    
    async def test_create_workshop_summary(self, db_session: AsyncSession, test_workshop):
        """Test creating workshop summary"""
        summary = WorkshopSummary(
            id=uuid.uuid4(),
            workshop_id=test_workshop.id,
            format="executive",
            content="Test executive summary content",
            summary_metadata={"key_findings": ["Finding 1"]},
            sections=["findings", "recommendations"]
        )
        db_session.add(summary)
        await db_session.commit()
        await db_session.refresh(summary)
        
        assert summary.id is not None
        assert summary.format == "executive"
    
    async def test_create_detected_anomaly(self, db_session: AsyncSession, test_workshop):
        """Test creating detected anomaly"""
        anomaly = DetectedAnomaly(
            id=uuid.uuid4(),
            workshop_id=test_workshop.id,
            anomaly_type="voting_uniform",
            severity="warning",
            details={"participant_id": str(uuid.uuid4())},
            recommendation="Consider checking in with the participant"
        )
        db_session.add(anomaly)
        await db_session.commit()
        await db_session.refresh(anomaly)
        
        assert anomaly.id is not None
        assert anomaly.anomaly_type == "voting_uniform"
    
    async def test_create_copilot_settings(self, db_session: AsyncSession, test_workshop):
        """Test creating copilot settings"""
        settings = CopilotSettings(
            id=uuid.uuid4(),
            workshop_id=test_workshop.id,
            mode="proactive",
            engagement_alerts_enabled=True,
            voting_anomaly_alerts_enabled=True,
            content_suggestions_enabled=True,
            discussion_prompts_enabled=True,
            inactivity_threshold_minutes="8",
            variance_alert_threshold="2.5",
            rapid_voting_threshold_seconds="5"
        )
        db_session.add(settings)
        await db_session.commit()
        await db_session.refresh(settings)
        
        assert settings.id is not None
        assert settings.mode == "proactive"
        assert settings.engagement_alerts_enabled is True
