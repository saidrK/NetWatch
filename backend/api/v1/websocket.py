"""
api/v1/websocket.py — WebSocket dashboard temps réel (BLOC 4)
WS /ws/dashboard -> push métriques toutes les 30s
Fiabilisation : asyncio.wait_for sur DB/Influx, gestion propre de WebSocketDisconnect
"""
import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from database.postgresql import AsyncSessionLocal
from database.influxdb import InfluxDBService
from models.equipement import Equipement, StatutEquipement
from models.alerte import Alerte, NiveauAlerte
from services.ia_service import get_ia_service

router = APIRouter()
logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"✅ WebSocket connecté — {len(self.active)} client(s)")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
            logger.info(f"🔌 WebSocket déconnecté — {len(self.active)} client(s)")

    async def broadcast(self, message: dict):
        payload = json.dumps(message, default=str)
        disconnected = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)


manager = ConnectionManager()
TIMEOUT_METRICS = 10.0  # Timeout strict pour la récupération des métriques


@router.websocket("/dashboard")
async def websocket_dashboard(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            try:
                # Construire et envoyer le payload dashboard
                data = await asyncio.wait_for(_construire_payload(), timeout=TIMEOUT_METRICS)
                await ws.send_text(json.dumps(data, default=str))
            except asyncio.TimeoutError:
                logger.error("❌ WS: Timeout lors de la récupération des métriques InfluxDB/PG")
                error_payload = {
                    "type": "error",
                    "timestamp": datetime.utcnow().isoformat(),
                    "code": "metrics_unavailable",
                    "message": "Les métriques sont temporairement inaccessibles (Timeout).",
                }
                await ws.send_text(json.dumps(error_payload))
            except Exception as e:
                logger.error(f"❌ WS: Erreur interne: {e}")
                error_payload = {
                    "type": "error",
                    "timestamp": datetime.utcnow().isoformat(),
                    "code": "internal_error",
                    "message": "Erreur lors de la construction du dashboard.",
                }
                await ws.send_text(json.dumps(error_payload))

            # Attendre 10s OU un message entrant du client (ping/pong/disconnect)
            # Sans recv(), le browser ferme la connexion WebSocket inactive
            recv_task  = asyncio.ensure_future(ws.receive_text())
            sleep_task = asyncio.ensure_future(asyncio.sleep(10))
            done, pending = await asyncio.wait(
                [recv_task, sleep_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            # Annuler la tâche qui n'a pas fini
            for t in pending:
                t.cancel()
            # Si recv() a terminé en premier, vérifier si c'est une déconnexion
            if recv_task in done:
                try:
                    recv_task.result()  # lève WebSocketDisconnect si client parti
                except Exception:
                    break  # client déconnecté → sortir de la boucle

    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as e:
        logger.error(f"❌ WebSocket error critique : {e}")
        manager.disconnect(ws)



async def _construire_payload() -> dict:
    async with AsyncSessionLocal() as db:
        influx = InfluxDBService()
        ia     = get_ia_service()

        # Ne sélectionner que les équipements actifs (conformité Soft-Delete BLOC 3)
        result = await db.execute(select(Equipement).where(Equipement.is_active == True))
        equipements = result.scalars().all()

        equipements_data = []
        for eq in equipements:
            # Appel InfluxDB potentiellement bloquant
            metrique = await influx.derniere(eq.id)
            niveau   = "INCONNU"
            metrics  = {}
            
            statut_eq = getattr(eq, "statut", None) or getattr(eq, "status", None)

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
                "statut":     statut_eq.value if hasattr(statut_eq, "value") else str(statut_eq or "INCONNU"),
                "niveau_ia":  niveau,
                "metriques":  metrics,
                "dernier_vu": eq.dernier_vu,
            })

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

        total        = len(equipements)
        en_ligne     = sum(
            1 for e in equipements
            if (getattr(e, "statut", None) or getattr(e, "status", None)) == StatutEquipement.EN_LIGNE
        )
        hors_ligne   = total - en_ligne
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


async def notifier_alerte(alerte_data: dict):
    await manager.broadcast({
        "type":      "nouvelle_alerte",
        "alerte":    alerte_data,
        "timestamp": datetime.utcnow().isoformat(),
    })
