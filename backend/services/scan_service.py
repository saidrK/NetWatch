"""
— Intégration Nmap → FastAPI
Appelle la logique de scan_reseau.py depuis l'API REST
"""
import logging
from datetime import datetime

import nmap
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models.equipement import Equipement, Port, StatutEquipement, TypeEquipement

logger   = logging.getLogger(__name__)
settings = get_settings()


# Heuristique type équipement
def _deviner_type(hostname: str, os_detecte: str, ports: list[int]) -> TypeEquipement:
    h = (hostname or "").lower()
    o = (os_detecte or "").lower()

    if any(k in h for k in ["router", "routeur", "gw", "gateway"]):
        return TypeEquipement.ROUTEUR
    if any(k in h for k in ["switch", "sw-"]):
        return TypeEquipement.SWITCH
    if any(k in h for k in ["srv", "server", "serveur", "web", "db"]):
        return TypeEquipement.SERVEUR
    if any(k in h for k in ["printer", "imprimante"]):
        return TypeEquipement.IMPRIMANTE
    if any(k in o for k in ["cisco", "juniper"]):
        return TypeEquipement.ROUTEUR
    if any(k in o for k in ["linux", "ubuntu", "rhel", "windows server"]):
        return TypeEquipement.SERVEUR
    if any(k in o for k in ["windows 10", "windows 11", "macos"]):
        return TypeEquipement.PC
    return TypeEquipement.INCONNU


# ─── Scan principal ───────────────────────────────────────
async def lancer_scan(
    db: AsyncSession,
    plage: str = None,
) -> dict:
    """
    Lance un scan Nmap sur la plage IP et sauvegarde dans PostgreSQL.
    Retourne un résumé des résultats.
    """
    plage = plage or settings.reseau_plage
    logger.info(f"🔍 Scan Nmap sur {plage}...")

    nm = nmap.PortScanner()
    try:
        nm.scan(hosts=plage, arguments="-sV -T4 --open --host-timeout 30s")
    except Exception as e:
        logger.error(f"❌ Nmap error: {e}")
        raise RuntimeError(f"Erreur Nmap : {e}")

    hotes = nm.all_hosts()
    resultats = {
        "plage": plage,
        "timestamp": datetime.utcnow().isoformat(),
        "hotes_detectes": len(hotes),
        "equipements_sauvegardes": 0,
        "ports_sauvegardes": 0,
    }

    for host in hotes:
        try:
            info      = nm[host]
            hostname  = info.hostname() or None
            mac       = info["addresses"].get("mac", None)
            os_match  = info.get("osmatch", [])
            os_detecte = os_match[0]["name"] if os_match else None

            # Ports ouverts
            ports_list = []
            for proto in info.all_protocols():
                for numero, details in info[proto].items():
                    if details["state"] == "open":
                        ports_list.append({
                            "numero":    numero,
                            "protocole": proto.upper(),
                            "service":   details.get("name"),
                            "service_version":   f"{details.get('product','')} {details.get('version','')}".strip() or None,
                        })

            type_eq = _deviner_type(hostname, os_detecte, [p["numero"] for p in ports_list])

            # UPSERT équipement
            result = await db.execute(
                select(Equipement).where(Equipement.adresse_ip == host)
            )
            eq = result.scalar_one_or_none()

            if eq:
                eq.adresse_mac = mac or eq.adresse_mac
                eq.hostname    = hostname or eq.hostname
                eq.type        = type_eq
                eq.statut      = StatutEquipement.EN_LIGNE
                eq.os_detecte  = os_detecte or eq.os_detecte
                eq.dernier_vu  = datetime.utcnow()
            else:
                eq = Equipement(
                    adresse_ip=host,
                    adresse_mac=mac,
                    hostname=hostname,
                    type=type_eq,
                    statut=StatutEquipement.EN_LIGNE,
                    os_detecte=os_detecte,
                    dernier_vu=datetime.utcnow(),
                )
                db.add(eq)
                await db.flush()

            # Supprimer anciens ports directement en SQL
            from sqlalchemy import delete as sql_delete
            await db.execute(sql_delete(Port).where(Port.equipement_id == eq.id))
            await db.flush()

            for p in ports_list:
                db.add(Port(
                    equipement_id=eq.id,
                    numero=p["numero"],
                    protocole=p["protocole"],
                    service=p["service"],
                    service_version=p["service_version"],
                    ouvert=True,
                ))

            resultats["equipements_sauvegardes"] += 1
            resultats["ports_sauvegardes"]       += len(ports_list)
            logger.info(f"  ✅ {host} | {hostname or 'N/A'} | {len(ports_list)} ports")

        except Exception as e:
            logger.error(f"  ❌ Erreur {host} : {e}")

    # Marquer HORS_LIGNE les équipements non détectés
    await _marquer_hors_ligne(db, hotes)

    await db.flush()
    return resultats


async def _marquer_hors_ligne(db: AsyncSession, ips_detectees: list[str]):
    """Marque HORS_LIGNE les équipements absents du dernier scan."""
    result = await db.execute(select(Equipement))
    tous = result.scalars().all()
    for eq in tous:
        if eq.adresse_ip not in ips_detectees:
            eq.statut = StatutEquipement.HORS_LIGNE