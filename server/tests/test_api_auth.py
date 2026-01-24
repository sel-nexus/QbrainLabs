"""
Authentication API tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAuthAPI:
    """Test authentication endpoints"""
    
    async def test_signup_success(self, client: AsyncClient, sample_user_data: dict):
        """Test successful user registration"""
        response = await client.post("/api/auth/signup", json=sample_user_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "access_token" in data or "user" in data
    
    async def test_signup_duplicate_email(self, client: AsyncClient, sample_user_data: dict):
        """Test registration with duplicate email fails"""
        # First signup
        await client.post("/api/auth/signup", json=sample_user_data)
        # Second signup with same email
        response = await client.post("/api/auth/signup", json=sample_user_data)
        assert response.status_code in [400, 409]
    
    async def test_login_success(self, client: AsyncClient, sample_user_data: dict):
        """Test successful login"""
        # Create user first
        await client.post("/api/auth/signup", json=sample_user_data)
        # Login
        login_data = {
            "email": sample_user_data["email"],
            "password": sample_user_data["password"]
        }
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
    
    async def test_login_invalid_credentials(self, client: AsyncClient):
        """Test login with invalid credentials fails"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code in [401, 404]
    
    async def test_login_missing_fields(self, client: AsyncClient):
        """Test login with missing fields fails"""
        response = await client.post("/api/auth/login", json={})
        assert response.status_code == 422


@pytest.mark.asyncio
class TestAuthValidation:
    """Test authentication validation"""
    
    async def test_signup_invalid_email(self, client: AsyncClient):
        """Test signup with invalid email fails"""
        user_data = {
            "email": "invalid-email",
            "password": "testpassword123",
            "name": "Test User"
        }
        response = await client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 422
    
    async def test_signup_short_password(self, client: AsyncClient):
        """Test signup with short password fails"""
        user_data = {
            "email": "test@example.com",
            "password": "123",
            "name": "Test User"
        }
        response = await client.post("/api/auth/signup", json=user_data)
        assert response.status_code == 422
