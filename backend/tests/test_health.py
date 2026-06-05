"""
— Tests du health check et des endpoints système
"""
import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.mark.asyncio
async def test_health_check():
    """Vérifie que le health check retourne bien un état 'ok' ou 'degraded'."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code in (200, 503)
    data = response.json()
    assert "status" in data
    assert data["status"] in ("ok", "degraded")
    assert "services" in data
    assert "api" in data["services"]
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_root():
    """Vérifie que la racine API retourne les informations de base."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "docs" in data
    assert "health" in data


@pytest.mark.asyncio
async def test_performance_header():
    """Vérifie que le header X-Response-Time est bien présent (middleware de perf)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert "x-response-time" in response.headers
