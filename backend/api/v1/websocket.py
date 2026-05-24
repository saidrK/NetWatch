"""
— WebSocket dashboard temps réel
WS /ws/dashboard -> push métriques toutes les 30s sans rechargement page
"""
import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgresql import AsyncSessionLocal
from database.influxdb import InfluxDBService
from models.equipement import Equipement, StatutEquipement
from models.alerte import Alerte, NiveauAlerte
from services.ia_service import get_ia_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Gestionnaire de connexions WebSocket
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"✅ WebSocket connecté — {len(self.active)} client(s)")

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)
        logger.info(f"🔌 WebSocket déconnecté — {len(self.active)} client(s)")

    async def broadcast(self, message: dict):
        """Envoie un message à tous les clients connectés."""
        payload = json.dumps(message, default=str)
        disconnected = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.active.remove(ws)


manager = ConnectionManager()


# WS /ws/dashboard
@router.websocket("/dashboard")
async def websocket_dashboard(ws: WebSocket):
    """
    WebSocket principal du dashboard.
    Pousse toutes les 30 secondes :
      - métriques de tous les équipements
      - alertes non acquittées
      - statut global du réseau
    """
    await manager.connect(ws)
    try:
        while True:
            data = await _construire_payload()
            await ws.send_text(json.dumps(data, default=str))
            await asyncio.sleep(30)   # BF03 : toutes les 30 secondes

    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as e:
        logger.error(f"❌ WebSocket error : {e}")
        manager.disconnect(ws)


async def _construire_payload() -> dict:
    """
    Construit le payload JSON envoyé au dashboard :
    - équipements avec leur dernier statut
    - alertes WARNING/CRITIQUE non acquittées
    - compteurs globaux
    """
    async with AsyncSessionLocal() as db:
        influx = InfluxDBService()
        ia     = get_ia_service()

        # Équipements
        result = await db.execute(select(Equipement))
        equipements = result.scalars().all()

        equipements_data = []
        for eq in equipements:
            metrique = await influx.derniere(eq.id)
            niveau   = "INCONNU"
            metrics  = {}

            if metrique:
                niv, _ = ia.analyser(metrique)
                niveau = niv.value
                metrics = {
                    "cpu_usage":  metrique.cpu_usage,
                    "ram_usage":  metrique.ram_usage,
                    "bp_entrant": metrique.bp_entrant,
                    "bp_sortant": metrique.bp_sortant,
                    "disponible": metrique.disponible,
                }

            equipements_data.append({
                "id":         eq.id,
                "adresse_ip": eq.adresse_ip,
                "hostname":   eq.hostname,
                "type":       eq.type.value if hasattr(eq.type, "value") else str(eq.type),
                "statut":     eq.statut.value if hasattr(eq.statut, "value") else str(eq.statut),
                "niveau_ia":  niveau,
                "metriques":  metrics,
                "dernier_vu": eq.dernier_vu,
            })

        # Alertes non acquittées WARNING/CRITIQUE
        result_alertes = await db.execute(
            select(Alerte)
            .where(Alerte.acquittee == False)
            .where(Alerte.niveau.in_([NiveauAlerte.WARNING, NiveauAlerte.CRITIQUE]))
            .order_by(Alerte.timestamp.desc())
            .limit(20)
        )
        alertes = result_alertes.scalars().all()
        alertes_data = [{
            "id":            a.id,
            "message":       a.message,
            "niveau":        a.niveau.value,
            "equipement_id": a.equipement_id,
            "timestamp":     a.timestamp,
        } for a in alertes]

        # Compteurs globaux
        total        = len(equipements)
        en_ligne     = sum(1 for e in equipements if e.statut == StatutEquipement.EN_LIGNE)
        hors_ligne   = sum(1 for e in equipements if e.statut == StatutEquipement.HORS_LIGNE)
        nb_critiques = sum(1 for a in alertes if a.niveau == NiveauAlerte.CRITIQUE)
        nb_warnings  = sum(1 for a in alertes if a.niveau == NiveauAlerte.WARNING)

        return {
            "type":       "dashboard_update",
            "timestamp":  datetime.utcnow().isoformat(),
            "resume": {
                "total_equipements": total,
                "en_ligne":          en_ligne,
                "hors_ligne":        hors_ligne,
                "alertes_critiques": nb_critiques,
                "alertes_warnings":  nb_warnings,
            },
            "equipements": equipements_data,
            "alertes":     alertes_data,
        }


# Broadcast externe (appelé par ia_service)
async def notifier_alerte(alerte_data: dict):
    """Pousse immédiatement une alerte à tous les clients connectés."""
    await manager.broadcast({
        "type":    "nouvelle_alerte",
        "alerte":  alerte_data,
        "timestamp": datetime.utcnow().isoformat(),
    })