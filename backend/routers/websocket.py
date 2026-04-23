from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from database import SessionLocal
import models
import asyncio
import random

router = APIRouter()


def get_latest_metrics(db) -> dict:
    """
    Récupère les dernières métriques de chaque équipement depuis la DB.
    Retourne un dict avec la moyenne globale + le détail par device.
    """
    devices = db.query(models.Device).all()
    result = []

    for device in devices:
        # Dernière métrique de cet équipement
        last = (
            db.query(models.Metric)
            .filter(models.Metric.device_id == device.id)
            .order_by(models.Metric.timestamp.desc())
            .first()
        )
        if last:
            result.append({
                "device_id": device.id,
                "device_name": device.name,
                "ip": device.ip_address,
                "status": device.status,
                "cpu": last.cpu,
                "ram": last.ram,
                "bandwidth": last.bandwidth,
                "timestamp": last.timestamp.isoformat(),
            })

    # Si aucune métrique en DB → données simulées pour le dev
    if not result:
        return {
            "source": "simulated",
            "devices": [],
            "summary": {
                "cpu": round(random.uniform(10, 90), 1),
                "ram": round(random.uniform(20, 85), 1),
                "bandwidth": round(random.uniform(50, 200), 1),
            }
        }

    # Calcul de la moyenne globale
    avg_cpu = round(sum(d["cpu"] for d in result) / len(result), 1)
    avg_ram = round(sum(d["ram"] for d in result) / len(result), 1)
    avg_bw  = round(sum(d["bandwidth"] for d in result) / len(result), 1)

    return {
        "source": "database",
        "devices": result,
        "summary": {
            "cpu": avg_cpu,
            "ram": avg_ram,
            "bandwidth": avg_bw,
        }
    }


@router.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    """
    WebSocket temps réel — envoie les métriques toutes les 5 secondes.
    Le client React peut se connecter sur ws://localhost:8000/ws/metrics
    """
    await websocket.accept()
    try:
        while True:
            db = SessionLocal()
            try:
                data = get_latest_metrics(db)
            finally:
                db.close()

            await websocket.send_json(data)
            await asyncio.sleep(5)

    except WebSocketDisconnect:
        # Client déconnecté proprement — pas d'erreur à logger
        pass
