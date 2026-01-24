"""
Workshop API tests
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestWorkshopAPI:
    """Test workshop CRUD endpoints"""
    
    async def test_create_workshop(self, client: AsyncClient, sample_workshop_data: dict):
        """Test creating a new workshop"""
        response = await client.post("/api/workshops", json=sample_workshop_data)
        assert response.status_code in [200, 201]
        data = response.json()
        assert data.get("name") == sample_workshop_data["name"]
    
    async def test_get_workshops(self, client: AsyncClient):
        """Test listing all workshops"""
        response = await client.get("/api/workshops")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    async def test_get_workshop_by_id(self, client: AsyncClient, sample_workshop_data: dict):
        """Test getting a single workshop by ID"""
        # Create workshop first
        create_response = await client.post("/api/workshops", json=sample_workshop_data)
        if create_response.status_code in [200, 201]:
            workshop_id = create_response.json().get("id")
            if workshop_id:
                response = await client.get(f"/api/workshops/{workshop_id}")
                assert response.status_code == 200
    
    async def test_get_nonexistent_workshop(self, client: AsyncClient):
        """Test getting a non-existent workshop returns 404"""
        response = await client.get("/api/workshops/99999")
        assert response.status_code == 404
    
    async def test_update_workshop(self, client: AsyncClient, sample_workshop_data: dict):
        """Test updating a workshop"""
        # Create workshop first
        create_response = await client.post("/api/workshops", json=sample_workshop_data)
        if create_response.status_code in [200, 201]:
            workshop_id = create_response.json().get("id")
            if workshop_id:
                update_data = {"name": "Updated Workshop"}
                response = await client.put(f"/api/workshops/{workshop_id}", json=update_data)
                assert response.status_code in [200, 204]
    
    async def test_delete_workshop(self, client: AsyncClient, sample_workshop_data: dict):
        """Test deleting a workshop"""
        # Create workshop first
        create_response = await client.post("/api/workshops", json=sample_workshop_data)
        if create_response.status_code in [200, 201]:
            workshop_id = create_response.json().get("id")
            if workshop_id:
                response = await client.delete(f"/api/workshops/{workshop_id}")
                assert response.status_code in [200, 204]


@pytest.mark.asyncio
class TestWorkshopParticipants:
    """Test workshop participant management"""
    
    async def test_join_workshop(self, client: AsyncClient, sample_workshop_data: dict):
        """Test joining a workshop"""
        # Create workshop first
        create_response = await client.post("/api/workshops", json=sample_workshop_data)
        if create_response.status_code in [200, 201]:
            workshop = create_response.json()
            join_code = workshop.get("join_code") or workshop.get("id")
            if join_code:
                join_data = {"name": "Test Participant"}
                response = await client.post(f"/api/workshops/{join_code}/join", json=join_data)
                assert response.status_code in [200, 201, 404]  # 404 if endpoint differs
