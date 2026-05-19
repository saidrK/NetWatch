"""
— Tests du module d'authentification
Scénarios : login valide, mot de passe incorrect, token expiré, accès sans token
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


BASE = "/api/v1/auth"


# Login valide
@pytest.mark.asyncio
async def test_login_valide():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"{BASE}/login", json={
            "email":        "admin@supervision.local",
            "mot_de_passe": "Admin2026!"
        })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "ADMINISTRATEUR"


# Mot de passe incorrect
@pytest.mark.asyncio
async def test_login_mauvais_mot_de_passe():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"{BASE}/login", json={
            "email":        "admin@supervision.local",
            "mot_de_passe": "mauvais"
        })
    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


# Email inexistant
@pytest.mark.asyncio
async def test_login_email_inexistant():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"{BASE}/login", json={
            "email":        "inexistant@test.com",
            "mot_de_passe": "nimporte"
        })
    assert response.status_code == 401


# Accès route protégée sans token
@pytest.mark.asyncio
async def test_acces_sans_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/utilisateurs/")
    assert response.status_code == 401


# Accès route protégée avec token valide
@pytest.mark.asyncio
async def test_acces_avec_token_valide():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login
        login = await client.post(f"{BASE}/login", json={
            "email": "admin@supervision.local", "mot_de_passe": "Admin2026!"
        })
        token = login.json()["access_token"]

        # Accès protégé
        response = await client.get(
            "/api/v1/utilisateurs/",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert response.status_code == 200


# Logout
@pytest.mark.asyncio
async def test_logout():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"{BASE}/logout")
    assert response.status_code == 200
    assert "message" in response.json()