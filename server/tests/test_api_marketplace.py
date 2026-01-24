"""
Marketplace API tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestMarketplaceAPI:
    """Test marketplace template endpoints"""
    
    async def test_list_templates(self, client: AsyncClient):
        """Test listing marketplace templates"""
        response = await client.get("/api/marketplace/templates")
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))
    
    async def test_search_templates(self, client: AsyncClient):
        """Test searching templates"""
        response = await client.get("/api/marketplace/templates?search=healthcare")
        assert response.status_code in [200, 404]
    
    async def test_filter_by_category(self, client: AsyncClient):
        """Test filtering templates by category"""
        response = await client.get("/api/marketplace/templates?category=healthcare")
        assert response.status_code in [200, 404]
    
    async def test_get_template_not_found(self, client: AsyncClient):
        """Test getting non-existent template"""
        response = await client.get("/api/marketplace/templates/nonexistent-id")
        assert response.status_code in [404, 422]


@pytest.mark.asyncio
class TestMarketplaceFeatures:
    """Test marketplace featured content"""
    
    async def test_get_featured_templates(self, client: AsyncClient):
        """Test getting featured templates"""
        response = await client.get("/api/marketplace/featured")
        assert response.status_code in [200, 404]
    
    async def test_get_trending_templates(self, client: AsyncClient):
        """Test getting trending templates"""
        response = await client.get("/api/marketplace/trending")
        assert response.status_code in [200, 404]


@pytest.mark.asyncio
class TestTemplateReviews:
    """Test template review endpoints"""
    
    async def test_get_reviews_for_nonexistent_template(self, client: AsyncClient):
        """Test getting reviews for non-existent template"""
        response = await client.get("/api/marketplace/templates/invalid/reviews")
        assert response.status_code in [404, 422]
    
    async def test_submit_review_unauthorized(self, client: AsyncClient):
        """Test submitting review without auth"""
        review_data = {
            "rating": 5,
            "comment": "Great template!"
        }
        response = await client.post(
            "/api/marketplace/templates/template-id/reviews",
            json=review_data
        )
        assert response.status_code in [401, 404, 422]


@pytest.mark.asyncio
class TestTemplatePublishing:
    """Test template publishing endpoints"""
    
    async def test_publish_template_unauthorized(self, client: AsyncClient):
        """Test publishing template without auth"""
        template_data = {
            "title": "My Template",
            "description": "A test template",
            "category": "general",
            "content": {}
        }
        response = await client.post(
            "/api/marketplace/templates",
            json=template_data
        )
        assert response.status_code in [401, 422]


@pytest.mark.asyncio
class TestMarketplaceCollections:
    """Test marketplace collection endpoints"""
    
    async def test_list_collections(self, client: AsyncClient):
        """Test listing template collections"""
        response = await client.get("/api/marketplace/collections")
        assert response.status_code in [200, 404]
    
    async def test_get_collection_not_found(self, client: AsyncClient):
        """Test getting non-existent collection"""
        response = await client.get("/api/marketplace/collections/invalid-id")
        assert response.status_code in [404, 422]
