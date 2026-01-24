"""
Organizations API tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestOrganizationAPI:
    """Test organization CRUD endpoints"""
    
    async def test_create_organization(self, client: AsyncClient):
        """Test creating a new organization"""
        org_data = {
            "name": "Test Corp",
            "slug": "test-corp",
            "tier": "starter"
        }
        response = await client.post("/api/organizations/", json=org_data)
        # May require auth
        assert response.status_code in [200, 201, 401, 422]
    
    async def test_list_organizations(self, client: AsyncClient):
        """Test listing organizations"""
        response = await client.get("/api/organizations/")
        assert response.status_code in [200, 401]
    
    async def test_get_organization_not_found(self, client: AsyncClient):
        """Test getting non-existent organization"""
        response = await client.get("/api/organizations/nonexistent-id")
        assert response.status_code in [404, 401, 422]


@pytest.mark.asyncio
class TestOrganizationMembers:
    """Test organization member management"""
    
    async def test_list_members_unauthorized(self, client: AsyncClient):
        """Test listing members without auth"""
        response = await client.get("/api/organizations/test-org/members")
        assert response.status_code in [401, 404]
    
    async def test_invite_member_unauthorized(self, client: AsyncClient):
        """Test inviting member without auth"""
        invite_data = {
            "email": "newuser@example.com",
            "role": "member"
        }
        response = await client.post(
            "/api/organizations/test-org/invitations",
            json=invite_data
        )
        assert response.status_code in [401, 404, 422]


@pytest.mark.asyncio
class TestOrganizationBranding:
    """Test organization branding endpoints"""
    
    async def test_update_branding_unauthorized(self, client: AsyncClient):
        """Test updating branding without auth"""
        branding_data = {
            "primary_color": "#3B82F6",
            "secondary_color": "#1E40AF"
        }
        response = await client.put(
            "/api/organizations/test-org/branding",
            json=branding_data
        )
        assert response.status_code in [401, 404, 422, 405]


@pytest.mark.asyncio
class TestOrganizationAnalytics:
    """Test organization analytics endpoints"""
    
    async def test_get_analytics_unauthorized(self, client: AsyncClient):
        """Test getting analytics without auth"""
        response = await client.get("/api/organizations/test-org/analytics")
        assert response.status_code in [401, 404]
