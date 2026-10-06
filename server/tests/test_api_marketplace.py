"""
Marketplace API tests against the current routes: browsing is public,
template details and publishing require sign-in.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers_for


@pytest.mark.asyncio
class TestMarketplaceBrowsing:
    async def test_search_templates(self, client: AsyncClient):
        response = await client.get("/api/marketplace/search")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

    async def test_search_with_filters(self, client: AsyncClient):
        response = await client.get("/api/marketplace/search", params={"q": "healthcare", "category": "healthcare"})
        assert response.status_code == 200

    async def test_featured_templates(self, client: AsyncClient):
        response = await client.get("/api/marketplace/featured")
        assert response.status_code == 200
        assert "trending" in response.json()

    async def test_industries(self, client: AsyncClient):
        response = await client.get("/api/marketplace/industries")
        assert response.status_code == 200

    async def test_featured_collections(self, client: AsyncClient):
        response = await client.get("/api/marketplace/collections/featured")
        assert response.status_code == 200


@pytest.mark.asyncio
class TestMarketplaceAuth:
    async def test_template_details_require_auth(self, client: AsyncClient):
        response = await client.get("/api/marketplace/some-template-id")
        assert response.status_code == 401

    async def test_template_not_found(self, client: AsyncClient, make_user):
        response = await client.get("/api/marketplace/nonexistent-id", headers=auth_headers_for(await make_user()))
        assert response.status_code == 404

    async def test_create_template_requires_auth(self, client: AsyncClient):
        response = await client.post("/api/marketplace", json={"name": "My Template", "description": "A test template"})
        assert response.status_code == 401

    async def test_publish_requires_auth(self, client: AsyncClient):
        response = await client.post("/api/marketplace/template-id/publish", json={})
        assert response.status_code in (401, 422)
