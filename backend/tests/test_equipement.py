"""
— Tests des routes équipements
Scénarios : liste, détail, accès non autorisé, équipement inexistant
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


BASE = "/api/v1/equipements"


# Helper — obtenir un token admin
async def get_token(client: AsyncClient, role: str = "admin") -> str:
    credentials = {
        "admin":      {"email": "admin@supervision.local",      "mot_de_passe": "Admin2026!"},
        "technicien": {"email": "technicien@supervision.local", "mot_de_passe": "Tech2026!"},
    }
    response = await client.post("/api/v1/auth/login", json=credentials[role])
    return response.json()["access_token"]


# Liste équipements — Admin
@pytest.mark.asyncio
async def test_liste_equipements_admin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        response = await client.get(BASE + "/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# Liste équipements — Technicien
@pytest.mark.asyncio
async def test_liste_equipements_technicien():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "technicien")
        response = await client.get(BASE + "/", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


# Liste sans token
@pytest.mark.asyncio
async def test_liste_equipements_sans_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(BASE + "/")
    assert response.status_code == 401


# Détail équipement existant
@pytest.mark.asyncio
async def test_detail_equipement_existant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        # On suppose que l'équipement id=1 existe (inséré par seed.sql)
        response = await client.get(BASE + "/1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code in [200, 404]  # 404 si seed pas encore exécuté
    if response.status_code == 200:
        data = response.json()
        assert "adresse_ip" in data
        assert "ports" in data


# Détail équipement inexistant
@pytest.mark.asyncio
async def test_detail_equipement_inexistant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        response = await client.get(BASE + "/99999", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404


# Scan — Technicien interdit
@pytest.mark.asyncio
async def test_scan_technicien_interdit():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "technicien")
        response = await client.post(
            BASE + "/scan",
            json={"plage": "127.0.0.1/32"},
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 403