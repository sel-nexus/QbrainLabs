"""
Unit tests for US16: AI Copilot Service
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime
import uuid

from app.services.copilot_service import CopilotService
from app.models.models import (
    Workshop, WorkshopPhase, Participant, UseCase, Vote,
    CopilotSettings, CopilotMode
)


@pytest.fixture
def copilot_service():
    """Create a CopilotService instance in mock mode"""
    service = CopilotService()
    service.mock_mode = True  # Force mock mode for testing
    return service


@pytest.fixture
def mock_workshop():
    """Create a mock workshop for testing"""
    workshop = MagicMock(spec=Workshop)
    workshop.id = uuid.uuid4()
    workshop.title = "Test Workshop"
    workshop.current_phase = WorkshopPhase.INTAKE.value
    workshop.active_use_case_id = None
    workshop.facilitator_id = uuid.uuid4()
    return workshop


@pytest.fixture
def mock_participants():
    """Create mock participants for testing"""
    participants = []
    for i in range(5):
        p = MagicMock(spec=Participant)
        p.id = uuid.uuid4()
        p.display_name = f"Participant {i+1}"
        p.role = "PARTICIPANT"
        p.engagement_records = []  # no activity history (a bare MagicMock would fake one)
        participants.append(p)
    return participants


@pytest.fixture
def mock_use_cases():
    """Create mock use cases for testing"""
    use_cases = []
    titles = [
        "AI Invoice Processing",
        "Chatbot for Customer Support",
        "Predictive Maintenance"
    ]
    for i, title in enumerate(titles):
        uc = MagicMock(spec=UseCase)
        uc.id = uuid.uuid4()
        uc.title = title
        uc.description = f"Description for {title}"
        uc.participant_id = uuid.uuid4()
        uc.proposed_solution = f"Solution for {title}"
        use_cases.append(uc)
    return use_cases


@pytest.fixture
def mock_votes(mock_use_cases, mock_participants):
    """Create mock votes for testing"""
    votes = []
    for uc in mock_use_cases:
        for p in mock_participants[:3]:
            v = MagicMock(spec=Vote)
            v.id = uuid.uuid4()
            v.use_case_id = uc.id
            v.participant_id = p.id
            v.scores = {"Feasibility": 7, "Business Value": 8}
            votes.append(v)
    return votes


@pytest.fixture
def mock_settings():
    """Create mock copilot settings"""
    settings = MagicMock(spec=CopilotSettings)
    settings.mode = CopilotMode.PROACTIVE.value
    settings.engagement_alerts_enabled = True
    settings.voting_anomaly_alerts_enabled = True
    settings.content_suggestions_enabled = True
    settings.discussion_prompts_enabled = True
    settings.inactivity_threshold_minutes = "8"
    settings.variance_alert_threshold = "2.5"
    settings.rapid_voting_threshold_seconds = "5"
    return settings


class TestCopilotServiceInit:
    """Test CopilotService initialization"""
    
    def test_service_initializes_in_mock_mode(self, copilot_service):
        """Test that service initializes in mock mode without API key"""
        assert copilot_service.mock_mode is True
    
    def test_llm_is_none_in_mock_mode(self, copilot_service):
        """Test that LLM is not initialized in mock mode"""
        assert copilot_service.llm is None


class TestSuggestionGeneration:
    """Test suggestion generation functionality"""
    
    @pytest.mark.asyncio
    async def test_generate_suggestions_intake_phase(
        self, copilot_service, mock_workshop, mock_participants, 
        mock_use_cases, mock_votes, mock_settings
    ):
        """Test suggestion generation for intake phase"""
        mock_workshop.current_phase = WorkshopPhase.INTAKE.value
        
        suggestions = await copilot_service.generate_suggestions(
            workshop=mock_workshop,
            participants=mock_participants,
            use_cases=mock_use_cases,
            votes=mock_votes,
            settings=mock_settings
        )
        
        assert isinstance(suggestions, list)
    
    @pytest.mark.asyncio
    async def test_generate_suggestions_scoring_phase(
        self, copilot_service, mock_workshop, mock_participants,
        mock_use_cases, mock_votes, mock_settings
    ):
        """Test suggestion generation for scoring phase"""
        mock_workshop.current_phase = WorkshopPhase.SCORING.value
        mock_workshop.active_use_case_id = mock_use_cases[0].id
        
        suggestions = await copilot_service.generate_suggestions(
            workshop=mock_workshop,
            participants=mock_participants,
            use_cases=mock_use_cases,
            votes=mock_votes,
            settings=mock_settings
        )
        
        assert isinstance(suggestions, list)
    
    @pytest.mark.asyncio
    async def test_generate_suggestions_silent_mode(
        self, copilot_service, mock_workshop, mock_participants,
        mock_use_cases, mock_votes, mock_settings
    ):
        """Test that silent mode returns no suggestions"""
        mock_settings.mode = CopilotMode.SILENT.value
        
        suggestions = await copilot_service.generate_suggestions(
            workshop=mock_workshop,
            participants=mock_participants,
            use_cases=mock_use_cases,
            votes=mock_votes,
            settings=mock_settings
        )
        
        assert suggestions == []


class TestEngagementAnalysis:
    """Test engagement analysis functionality"""
    
    @pytest.mark.asyncio
    async def test_analyze_engagement_returns_metrics(
        self, copilot_service, mock_participants, mock_votes, mock_use_cases
    ):
        """Test that engagement analysis returns proper metrics"""
        result = await copilot_service.analyze_engagement(
            workshop_id=str(uuid.uuid4()),
            participants=mock_participants,
            votes=mock_votes,
            use_cases=mock_use_cases
        )
        
        assert "participants" in result
        assert "group_metrics" in result
        assert "avg_engagement" in result["group_metrics"]
        assert "at_risk_count" in result["group_metrics"]
        assert "total_participants" in result["group_metrics"]
    
    @pytest.mark.asyncio
    async def test_engagement_score_calculation(
        self, copilot_service, mock_participants, mock_votes, mock_use_cases
    ):
        """Test that engagement scores are calculated correctly"""
        result = await copilot_service.analyze_engagement(
            workshop_id=str(uuid.uuid4()),
            participants=mock_participants,
            votes=mock_votes,
            use_cases=mock_use_cases
        )
        
        for participant in result["participants"]:
            assert 0 <= participant["engagement_score"] <= 100
    
    def test_calculate_engagement_score_with_votes(self, copilot_service):
        """Test engagement score calculation with votes"""
        votes = [MagicMock(), MagicMock(), MagicMock()]
        for v in votes:
            v.scores = {"Feasibility": 7, "Business Value": 8}
        
        submissions = [MagicMock()]
        total_use_cases = 5
        
        score = copilot_service._calculate_engagement_score(votes, submissions, total_use_cases)
        assert 0 <= score <= 100
        assert score > 0  # Should have some score with votes and submissions
    
    def test_calculate_engagement_score_no_activity(self, copilot_service):
        """Test engagement score with no activity"""
        score = copilot_service._calculate_engagement_score([], [], 5)
        assert score == 0


class TestAnomalyDetection:
    """Test anomaly detection functionality"""
    
    @pytest.mark.asyncio
    async def test_detect_voting_anomalies(
        self, copilot_service, mock_participants, mock_votes
    ):
        """Test detection of voting anomalies"""
        anomalies = await copilot_service._detect_voting_anomalies(
            mock_participants, mock_votes
        )
        
        assert isinstance(anomalies, list)
    
    @pytest.mark.asyncio
    async def test_detect_uniform_voting_anomaly(
        self, copilot_service, mock_participants
    ):
        """Test detection of uniform voting pattern"""
        # Create votes with all same scores
        uniform_votes = []
        participant = mock_participants[0]
        for i in range(5):
            v = MagicMock(spec=Vote)
            v.id = uuid.uuid4()
            v.use_case_id = uuid.uuid4()
            v.participant_id = participant.id
            v.scores = {"Feasibility": 5, "Business Value": 5}  # All same
            uniform_votes.append(v)
        
        anomalies = await copilot_service._detect_voting_anomalies(
            mock_participants, uniform_votes
        )
        
        # Should detect uniform voting
        uniform_anomalies = [a for a in anomalies if a["type"] == "voting_uniform"]
        assert len(uniform_anomalies) > 0
    
    @pytest.mark.asyncio
    async def test_detect_content_anomalies(self, copilot_service, mock_use_cases):
        """Test detection of content anomalies"""
        anomalies = await copilot_service._detect_content_anomalies(mock_use_cases)
        assert isinstance(anomalies, list)
    
    @pytest.mark.asyncio
    async def test_detect_all_anomalies(
        self, copilot_service, mock_participants, mock_votes, mock_use_cases
    ):
        """Test detecting all types of anomalies"""
        anomalies = await copilot_service.detect_anomalies(
            workshop_id=str(uuid.uuid4()),
            data_type="all",
            participants=mock_participants,
            votes=mock_votes,
            use_cases=mock_use_cases
        )
        
        assert isinstance(anomalies, list)


class TestDiscussionPrompts:
    """Test discussion prompt generation"""
    
    @pytest.mark.asyncio
    async def test_generate_discussion_prompts(self, copilot_service, mock_use_cases):
        """Test generating discussion prompts for a use case"""
        prompts = await copilot_service.generate_discussion_prompts(
            use_case=mock_use_cases[0]
        )
        
        assert isinstance(prompts, list)
        assert len(prompts) > 0
        
        for prompt in prompts:
            assert "category" in prompt
            assert "question" in prompt
    
    @pytest.mark.asyncio
    async def test_generate_prompts_with_high_variance(self, copilot_service, mock_use_cases):
        """Test that high variance triggers additional prompts"""
        variance_data = {"std_dev": 3.5}
        
        prompts = await copilot_service.generate_discussion_prompts(
            use_case=mock_use_cases[0],
            variance_data=variance_data
        )
        
        assert len(prompts) > 0
        # Should have alignment prompt for high variance
        categories = [p["category"] for p in prompts]
        assert "Alignment" in categories


class TestSummaryGeneration:
    """Test summary generation functionality"""
    
    @pytest.mark.asyncio
    async def test_generate_summary_executive(
        self, copilot_service, mock_workshop, mock_use_cases, 
        mock_votes, mock_participants
    ):
        """Test generating executive summary"""
        summary = await copilot_service.generate_summary(
            workshop=mock_workshop,
            use_cases=mock_use_cases,
            votes=mock_votes,
            participants=mock_participants,
            format="executive"
        )
        
        assert "executive_summary" in summary
        assert "key_findings" in summary
        assert "top_recommendations" in summary
        assert "next_steps" in summary
        assert "participant_stats" in summary
        assert summary["is_mock"] is True
    
    @pytest.mark.asyncio
    async def test_summary_contains_participant_stats(
        self, copilot_service, mock_workshop, mock_use_cases,
        mock_votes, mock_participants
    ):
        """Test that summary includes participant statistics"""
        summary = await copilot_service.generate_summary(
            workshop=mock_workshop,
            use_cases=mock_use_cases,
            votes=mock_votes,
            participants=mock_participants,
            format="executive"
        )
        
        stats = summary["participant_stats"]
        assert "total" in stats
        assert "avg_engagement" in stats
        assert "at_risk" in stats


class TestVarianceAnalysis:
    """Test variance analysis functionality"""
    
    @pytest.mark.asyncio
    async def test_analyze_variance(self, copilot_service, mock_use_cases, mock_votes):
        """Test variance analysis for a use case"""
        use_case_id = str(mock_use_cases[0].id)
        
        result = await copilot_service.analyze_variance(use_case_id, mock_votes)
        
        assert "use_case_id" in result
        assert "vote_count" in result
        assert "std_dev" in result
        assert "is_significant" in result
    
    @pytest.mark.asyncio
    async def test_variance_with_no_votes(self, copilot_service):
        """Test variance analysis with no votes"""
        result = await copilot_service.analyze_variance(str(uuid.uuid4()), [])
        
        assert result["vote_count"] == 0
        assert result["std_dev"] == 0
        assert result["is_significant"] is False


class TestContentEnhancement:
    """Test content enhancement functionality"""
    
    @pytest.mark.asyncio
    async def test_enhance_content(self, copilot_service):
        """Test content enhancement"""
        content = {
            "title": "AI Chatbot",
            "description": "A chatbot for customer support",
            "kpi": "Reduce response time"
        }
        
        result = await copilot_service.enhance_content(content)
        
        assert "enhanced" in result
        assert "quality_score" in result
        assert "improvements_made" in result
    
    def test_calculate_quality_score(self, copilot_service):
        """Test quality score calculation"""
        content = {
            "title": "AI Invoice Processing",
            "description": "Use machine learning to extract data from invoices automatically",
            "kpi": "Reduce processing time by 50%"
        }
        
        score = copilot_service._calculate_quality_score(content)
        
        assert "completeness" in score
        assert "clarity" in score
        assert "technical_depth" in score
        assert "overall" in score
        assert 0 <= score["overall"] <= 1
    
    def test_quality_score_empty_content(self, copilot_service):
        """Test quality score with empty content"""
        content = {"title": "", "description": "", "kpi": ""}
        
        score = copilot_service._calculate_quality_score(content)
        
        assert score["completeness"] == 0
        assert score["clarity"] == 0


class TestHelperMethods:
    """Test helper methods"""
    
    @pytest.mark.asyncio
    async def test_detect_themes(self, copilot_service, mock_use_cases):
        """Test theme detection in use cases"""
        themes = await copilot_service._detect_themes(mock_use_cases)
        
        assert isinstance(themes, list)
    
    @pytest.mark.asyncio
    async def test_check_duplicates(self, copilot_service):
        """Test duplicate detection"""
        # Create similar use cases
        uc1 = MagicMock()
        uc1.id = uuid.uuid4()
        uc1.title = "AI Chatbot for Customer Support"
        uc1.description = "Build an AI-powered chatbot to help customers"
        
        uc2 = MagicMock()
        uc2.id = uuid.uuid4()
        uc2.title = "Customer Support AI Chatbot"
        uc2.description = "Create an AI chatbot for customer service"
        
        duplicates = await copilot_service._check_duplicates([uc1, uc2])
        
        assert isinstance(duplicates, list)
        # Should detect similarity
        if duplicates:
            assert duplicates[0]["similarity"] > 50
    
    @pytest.mark.asyncio
    async def test_calculate_scores(self, copilot_service, mock_use_cases, mock_votes):
        """Test score calculation for use cases"""
        scores = await copilot_service._calculate_scores(mock_use_cases, mock_votes)
        
        assert isinstance(scores, list)
        for score in scores:
            assert "id" in score
            assert "title" in score
            assert "avg_score" in score
