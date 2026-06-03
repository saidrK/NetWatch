"""
— Tests du service de notifications (déduplication, escalade)
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from services.notification_service import NotificationService, _dedup_cache, DEDUP_WINDOW_MINUTES


def make_mock_alerte(niveau_value: str, equipement_id: int = 1):
    """Crée un mock d'alerte pour les tests."""
    alerte = MagicMock()
    alerte.id = 99
    alerte.equipement_id = equipement_id
    alerte.message = f"Test alerte {niveau_value}"
    alerte.timestamp = datetime.utcnow()
    alerte.valeur_cpu = 85.0
    alerte.valeur_ram = 70.0
    niveau_mock = MagicMock()
    niveau_mock.value = niveau_value
    alerte.niveau = niveau_mock
    return alerte


@pytest.mark.asyncio
async def test_deduplication_bloque_doublons():
    """Vérifie que deux alertes identiques ne déclenchent qu'une seule notification."""
    service = NotificationService()
    alerte = make_mock_alerte("WARNING")
    db = AsyncMock()

    # Vider le cache de déduplication avant le test
    _dedup_cache.clear()

    with patch.object(service, 'envoyer_telegram', return_value=True) as mock_tg:
        await service.envoyer(db, alerte)
        await service.envoyer(db, alerte)  # Doublon — doit être ignoré
    
    # Telegram ne doit avoir été appelé qu'une seule fois
    assert mock_tg.call_count == 1


@pytest.mark.asyncio
async def test_info_ne_notifie_pas():
    """Vérifie que les alertes INFO ne déclenchent pas de notification réseau."""
    service = NotificationService()
    alerte = make_mock_alerte("INFO")
    db = AsyncMock()
    _dedup_cache.clear()

    with patch.object(service, 'envoyer_telegram', return_value=True) as mock_tg:
        await service.envoyer(db, alerte)
    
    # Aucun appel Telegram pour une alerte INFO
    assert mock_tg.call_count == 0


@pytest.mark.asyncio
async def test_critique_declenche_telegram():
    """Vérifie que les alertes CRITIQUE déclenchent Telegram."""
    service = NotificationService()
    alerte = make_mock_alerte("CRITIQUE", equipement_id=42)
    db = AsyncMock()
    _dedup_cache.clear()

    with patch.object(service, 'envoyer_telegram', return_value=True) as mock_tg:
        await service.envoyer(db, alerte)
    
    assert mock_tg.call_count == 1


@pytest.mark.asyncio
async def test_dedup_differents_equipements():
    """Vérifie que la déduplication ne bloque pas des alertes d'équipements différents."""
    service = NotificationService()
    alerte1 = make_mock_alerte("WARNING", equipement_id=1)
    alerte2 = make_mock_alerte("WARNING", equipement_id=2)
    db = AsyncMock()
    _dedup_cache.clear()

    with patch.object(service, 'envoyer_telegram', return_value=True) as mock_tg:
        await service.envoyer(db, alerte1)
        await service.envoyer(db, alerte2)  # Différent équipement — doit passer
    
    # Les deux doivent avoir envoyé
    assert mock_tg.call_count == 2
