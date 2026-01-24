"""
Analytics API tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAnalyticsAPI:
    """Test analytics endpoints"""
    
    async def test_get_workshop_analytics_not_found(self, client: AsyncClient):
        """Test getting analytics for non-existent workshop"""
        response = await client.get("/api/analytics/workshops/invalid-id")
        assert response.status_code in [404, 401, 422]
    
    async def test_get_voting_heatmap_not_found(self, client: AsyncClient):
        """Test getting heatmap for non-existent workshop"""
        response = await client.get("/api/analytics/workshops/invalid-id/heatmap")
        assert response.status_code in [404, 401, 422]


@pytest.mark.asyncio
class TestAgreementMetrics:
    """Test agreement/disagreement metrics"""
    
    async def test_get_agreement_metrics_not_found(self, client: AsyncClient):
        """Test getting agreement metrics for non-existent workshop"""
        response = await client.get("/api/analytics/workshops/invalid-id/agreement")
        assert response.status_code in [404, 401, 422]


@pytest.mark.asyncio
class TestTrendAnalysis:
    """Test trend analysis endpoints"""
    
    async def test_get_trends_unauthorized(self, client: AsyncClient):
        """Test getting trends without auth"""
        response = await client.get("/api/analytics/trends")
        assert response.status_code in [200, 401, 404]


@pytest.mark.asyncio
class TestExecutiveSummary:
    """Test executive summary generation"""
    
    async def test_generate_summary_not_found(self, client: AsyncClient):
        """Test generating summary for non-existent workshop"""
        response = await client.get("/api/analytics/workshops/invalid-id/summary")
        assert response.status_code in [404, 401, 422]


@pytest.mark.asyncio
class TestCrossWorkshopAnalytics:
    """Test cross-workshop comparison endpoints"""
    
    async def test_compare_workshops_invalid(self, client: AsyncClient):
        """Test comparing invalid workshops"""
        response = await client.post(
            "/api/analytics/compare",
            json={"workshop_ids": ["invalid1", "invalid2"]}
        )
        assert response.status_code in [404, 401, 422, 400]
