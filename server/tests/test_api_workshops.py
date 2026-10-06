"""
Workshop API tests (create, list, get, update, join) against the current routes.
"""
import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers_for

WORKSHOP = {
    "title": "Test Workshop",
    "config": {"criteria": [{"name": "Feasibility", "weight": 50}, {"name": "Business Value", "weight": 50}]},
}


async def _create(client: AsyncClient, headers: dict) -> dict:
    response = await client.post("/api/workshops/", json=WORKSHOP, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
class TestWorkshopAPI:
    async def test_create_workshop(self, client: AsyncClient, make_user):
        data = await _create(client, auth_headers_for(await make_user()))
        assert data["title"] == WORKSHOP["title"]
        assert data["pin"]

    async def test_list_shows_own_workshops_and_nothing_anonymously(self, client: AsyncClient, make_user):
        headers = auth_headers_for(await make_user())
        created = await _create(client, headers)

        mine = await client.get("/api/workshops/", headers=headers)
        assert mine.status_code == 200
        assert created["id"] in [w["id"] for w in mine.json()]

        anonymous = await client.get("/api/workshops/")
        assert anonymous.status_code == 200
        assert anonymous.json() == []

    async def test_get_workshop_by_id(self, client: AsyncClient, make_user):
        headers = auth_headers_for(await make_user())
        created = await _create(client, headers)
        response = await client.get(f"/api/workshops/{created['id']}", headers=headers)
        assert response.status_code == 200
        assert response.json()["title"] == WORKSHOP["title"]

    async def test_get_nonexistent_workshop(self, client: AsyncClient):
        response = await client.get("/api/workshops/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404

    async def test_update_workshop_title(self, client: AsyncClient, make_user):
        headers = auth_headers_for(await make_user())
        created = await _create(client, headers)
        response = await client.patch(f"/api/workshops/{created['id']}", json={"title": "Updated Workshop"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Workshop"


@pytest.mark.asyncio
class TestWorkshopParticipants:
    async def test_join_workshop_by_pin(self, client: AsyncClient, make_user):
        created = await _create(client, auth_headers_for(await make_user()))
        response = await client.post("/api/join", json={"pin": created["pin"], "display_name": "Test Participant", "role": "PARTICIPANT"})
        assert response.status_code in (200, 201), response.text
        assert response.json()["workshop_id"] == created["id"]
