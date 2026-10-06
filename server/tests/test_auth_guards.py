"""
Authentication Guards Tests
Tests for authentication and authorization middleware
"""
import pytest
from httpx import AsyncClient
from unittest.mock import patch, MagicMock


@pytest.mark.asyncio
class TestAuthenticationGuards:
    """Test authentication requirements on protected endpoints"""
    
    async def test_create_workshop_requires_auth(self, client: AsyncClient):
        """Test that creating a workshop requires authentication"""
        workshop_data = {
            "title": "Test Workshop",
            "config": {"criteria": []}
        }
        response = await client.post("/api/workshops/", json=workshop_data)
        # Should return 401 Unauthorized without auth token
        assert response.status_code == 401
    
    async def test_update_phase_requires_auth(self, client: AsyncClient):
        """Test that updating workshop phase requires authentication"""
        response = await client.post(
            "/api/workshops/test-id/phase",
            json={"phase": "VOTING"}
        )
        assert response.status_code == 401
    
    async def test_update_role_requires_auth(self, client: AsyncClient):
        """Test that updating participant role requires authentication"""
        response = await client.patch(
            "/api/test-participant-id/role",
            json={"role": "FACILITATOR"}
        )
        assert response.status_code in [401, 404]  # 401 if auth checked first, 404 if route not found
    
    async def test_join_workshop_no_auth_required(self, client: AsyncClient):
        """Test that joining a workshop does not require authentication"""
        join_data = {
            "pin": "ABC123",
            "display_name": "Test User",
            "role": "PARTICIPANT"
        }
        response = await client.post("/api/join", json=join_data)
        # Should not be 401 - either 404 (workshop not found) or 200/201
        assert response.status_code != 401


@pytest.mark.asyncio
class TestAuthenticatedEndpoints:
    """Test endpoints with valid authentication"""
    
    async def test_get_workshops_list(self, client: AsyncClient):
        """Anonymous callers get an empty list rather than an error"""
        response = await client.get("/api/workshops/")
        assert response.status_code == 200
        assert response.json() == []
    
    async def test_get_workshop_by_id_not_found(self, client: AsyncClient):
        """Test getting non-existent workshop returns 404"""
        response = await client.get("/api/workshops/nonexistent-id")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestAdminEndpoints:
    """Test admin-only endpoints"""
    
    async def test_admin_stats_requires_admin(self, client: AsyncClient):
        """Test that admin stats endpoint requires admin privileges"""
        response = await client.get("/api/admin/stats")
        # Should return 401 (not authenticated) or 403 (not admin)
        assert response.status_code in [401, 403]
    
    async def test_admin_workshops_requires_admin(self, client: AsyncClient):
        """Test that admin workshops list requires admin privileges"""
        response = await client.get("/api/admin/workshops")
        assert response.status_code in [401, 403]
    
    async def test_admin_users_requires_admin(self, client: AsyncClient):
        """Test that admin users list requires admin privileges"""
        response = await client.get("/api/admin/users")
        assert response.status_code in [401, 403]
