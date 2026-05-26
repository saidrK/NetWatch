"""
— Tests du WebSocket dashboard
Scénarios : connexion, réception messages, déconnexion, payload valide
"""
import pytest
import json
from httpx import AsyncClient, ASGITransport
from main import app


BASE_WS = "/ws/dashboard"


# Helper — obtenir un token admin
async def get_token(client: AsyncClient, role: str = "admin") -> str:
    credentials = {
        "admin":      {"email": "admin@supervision.local",      "mot_de_passe": "Admin2026!"},
        "technicien": {"email": "technicien@supervision.local", "mot_de_passe": "Tech2026!"},
    }
    response = await client.post("/api/v1/auth/login", json=credentials[role])
    return response.json()["access_token"]


# Connexion WebSocket — succès
@pytest.mark.asyncio
async def test_websocket_connexion():
    """Test que le WebSocket accepte les connexions."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        async with client.websocket(BASE_WS) as websocket:
            # Le WebSocket devrait accepter la connexion
            # Note: FastAPI WebSocket n'utilise pas le token Bearer standard
            # Pour l'instant, on teste juste que la connexion s'établit
            pass


# Réception message — payload valide
@pytest.mark.asyncio
async def test_websocket_reception_message():
    """Test que le WebSocket envoie des messages avec le payload attendu."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        async with client.websocket(BASE_WS) as websocket:
            # Recevoir le premier message (envoyé immédiatement après connexion)
            message = await websocket.receive_text()
            data = json.loads(message)
            
            # Vérifier la structure du payload
            assert "type" in data
            assert data["type"] == "dashboard_update"
            assert "timestamp" in data
            assert "resume" in data
            assert "equipements" in data
            assert "alertes" in data
            
            # Vérifier les compteurs dans resume
            resume = data["resume"]
            assert "total_equipements" in resume
            assert "en_ligne" in resume
            assert "hors_ligne" in resume
            assert "alertes_critiques" in resume
            assert "alertes_warnings" in resume


# Réception message — équipements structure
@pytest.mark.asyncio
async def test_websocket_equipements_structure():
    """Test que les équipements dans le payload ont la bonne structure."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        async with client.websocket(BASE_WS) as websocket:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            equipements = data["equipements"]
            assert isinstance(equipements, list)
            
            # Si des équipements sont présents, vérifier leur structure
            if len(equipements) > 0:
                eq = equipements[0]
                assert "id" in eq
                assert "adresse_ip" in eq
                assert "hostname" in eq
                assert "type" in eq
                assert "statut" in eq
                assert "niveau_ia" in eq
                assert "metriques" in eq
                assert "dernier_vu" in eq


# Réception message — alertes structure
@pytest.mark.asyncio
async def test_websocket_alertes_structure():
    """Test que les alertes dans le payload ont la bonne structure."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        async with client.websocket(BASE_WS) as websocket:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            alertes = data["alertes"]
            assert isinstance(alertes, list)
            
            # Si des alertes sont présentes, vérifier leur structure
            if len(alertes) > 0:
                alerte = alertes[0]
                assert "id" in alerte
                assert "message" in alerte
                assert "niveau" in alerte
                assert "equipement_id" in alerte
                assert "timestamp" in alerte


# Déconnexion WebSocket
@pytest.mark.asyncio
async def test_websocket_deconnexion():
    """Test que le WebSocket gère correctement la déconnexion."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        token = await get_token(client, "admin")
        async with client.websocket(BASE_WS) as websocket:
            # Recevoir un message
            message = await websocket.receive_text()
            assert message is not None
            
            # La déconnexion se fait automatiquement à la fin du context manager
            # Si aucune exception n'est levée, le test passe
