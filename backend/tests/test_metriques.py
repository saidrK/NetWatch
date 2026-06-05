"""
— Tests des routes métriques
Scénarios : dernière métrique, historique, collecte manuelle, accès non autorisé
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


BASE = "/api/v1/metriques"


# Helper — obtenir un token admin
async def get_token(client: AsyncClient, role: str = "admin") -> str:
    credentials = {
        "admin":      {"email": "admin@supervision.local",      "mot_de_passe": "Admin2026!"},
        "technicien": {"email": "technicien@supervision.local", "mot_de_passe": "Tech2026!"},
    }
    response = await client.post("/api/v1/auth/login", json=credentials[role])
    return response.json()["access_token"]


# Dernière métrique — équipement existant
@pytest.mark.asyncio
async def test_derniere_metrique_equipement_existant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        # On suppose que l'équipement id=1 existe
        response = await client.get(f"{BASE}/1", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code in [200, 404]  # 404 si pas de métriques
    if response.status_code == 200:
        data = response.json()
        assert "equipement_id" in data
        assert "cpu_usage" in data
        assert "ram_usage" in data
        assert "niveau" in data


# Dernière métrique — équipement inexistant
@pytest.mark.asyncio
async def test_derniere_metrique_equipement_inexistant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        response = await client.get(f"{BASE}/99999", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404


# Dernière métrique — sans token
@pytest.mark.asyncio
async def test_derniere_metrique_sans_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"{BASE}/1")
    assert response.status_code == 401


# Historique métriques
@pytest.mark.asyncio
async def test_historique_metriques():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        response = await client.get(
            f"{BASE}/1/historique",
            params={"heures": 24},
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)


# Collecte manuelle — Admin
@pytest.mark.asyncio
async def test_collecter_metriques_admin():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        response = await client.post(
            f"{BASE}/collecter",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200
    assert "message" in response.json()


# Collecte manuelle — Technicien
@pytest.mark.asyncio
async def test_collecter_metriques_technicien():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "technicien")
        response = await client.post(
            f"{BASE}/collecter",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200  # Technicien peut aussi collecter


# Collecte manuelle — sans token
@pytest.mark.asyncio
async def test_collecter_metriques_sans_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"{BASE}/collecter")
    assert response.status_code == 401
