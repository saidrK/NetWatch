"""
— Tests routes alertes + acquittement
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

BASE = "/api/v1/alertes"


async def get_token(client: AsyncClient, role: str = "admin") -> str:
    creds = {
        "admin":      {"email": "admin@supervision.local",      "mot_de_passe": "Admin2026!"},
        "technicien": {"email": "technicien@supervision.local", "mot_de_passe": "Tech2026!"},
    }
    r = await client.post("/api/v1/auth/login", json=creds[role])
    return r.json()["access_token"]


# Liste alertes — authentifié
@pytest.mark.asyncio
async def test_liste_alertes_authentifie():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client)
        r = await client.get(BASE + "/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# Liste alertes — non authentifié
@pytest.mark.asyncio
async def test_liste_alertes_sans_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(BASE + "/")
    assert r.status_code == 401


# Filtre par niveau
@pytest.mark.asyncio
async def test_liste_alertes_filtre_niveau():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client)
        r = await client.get(
            BASE + "/?niveau=CRITIQUE",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert r.status_code == 200
    for alerte in r.json():
        assert alerte["niveau"] == "CRITIQUE"


# Détail alerte inexistante
@pytest.mark.asyncio
async def test_detail_alerte_inexistante():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client)
        r = await client.get(BASE + "/99999", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404


# Acquittement — Technicien autorisé
@pytest.mark.asyncio
async def test_acquittement_technicien_autorise():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "technicien")
        # Liste pour trouver une alerte non acquittée
        r = await client.get(
            BASE + "/?acquittee=false",
            headers={"Authorization": f"Bearer {token}"}
        )
        alertes = r.json()
        if alertes:
            alerte_id = alertes[0]["id"]
            r2 = await client.put(
                BASE + f"/{alerte_id}/acquitter",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert r2.status_code == 200
            assert r2.json()["acquittee"] is True


# Acquittement — alerte inexistante
@pytest.mark.asyncio
async def test_acquittement_alerte_inexistante():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client)
        r = await client.put(
            BASE + "/99999/acquitter",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert r.status_code == 404