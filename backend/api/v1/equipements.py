"""
api/v1/equipements.py — Routes équipements réseau
GET    /equipements          → liste tous les équipements actifs
GET    /equipements/{id}     → détail + ports
POST   /equipements/scan     → lancer scan Nmap (Admin)
DELETE /equipements/{id}     → soft delete (Admin)
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database.postgresql import get_db
from models.equipement import Equipement, Port
from models.utilisateur import Utilisateur
from services.scan_service import lancer_scan
from api.v1.utilisateurs import get_current_user, admin_requis

router = APIRouter()


# ── Schémas Pydantic ──────────────────────────────────────────────────────────
class PortResponse(BaseModel):
    id:        int
    numero:    int
    protocole: str
    service:   Optional[str]
    service_version:   Optional[str] = None
    ouvert:    bool

    class Config:
        from_attributes = True


class EquipementResponse(BaseModel):
    id:          int
    adresse_ip:  str
    adresse_mac: Optional[str]
    hostname:    Optional[str]
    type:        str
    statut:      str
    os_detecte:  Optional[str] = None
    dernier_vu:  Optional[datetime]
    created_at:  datetime
    is_active:   bool

    class Config:
        from_attributes = True


class EquipementDetailResponse(EquipementResponse):
    ports: list[PortResponse] = []


class ScanRequest(BaseModel):
    plage: Optional[str] = None


class ScanResponse(BaseModel):
    plage:                   str
    timestamp:               str
    hotes_detectes:          int
    equipements_sauvegardes: int
    ports_sauvegardes:       int


# ── GET /equipements ──────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=list[EquipementResponse],
    summary="Liste tous les équipements actifs",
)
async def lister_equipements(
    statut: Optional[str] = None,
    type:   Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = select(Equipement).where(Equipement.is_active == True).order_by(Equipement.adresse_ip)

    if statut:
        query = query.where(Equipement.statut == statut)
    if type:
        query = query.where(Equipement.type == type)

    result = await db.execute(query)
    return result.scalars().all()


# ── GET /equipements/{id} ─────────────────────────────────────────────────────
@router.get(
    "/{equipement_id}",
    response_model=EquipementDetailResponse,
    summary="Détail d'un équipement actif",
)
async def get_equipement(
    equipement_id: int,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(Equipement)
        .options(selectinload(Equipement.ports))
        .where(Equipement.id == equipement_id)
        .where(Equipement.is_active == True)
    )
    eq = result.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Équipement introuvable ou supprimé")
    return eq


# ── POST /equipements/scan ────────────────────────────────────────────────────
@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Lancer un scan réseau Nmap (Admin)",
)
async def scan_reseau(
    body: ScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(admin_requis),
):
    try:
        resultats = await lancer_scan(db=db, plage=body.plage)
        return ScanResponse(**resultats)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── DELETE /equipements/{id} (Soft Delete) ────────────────────────────────────
@router.delete(
    "/{equipement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Suppression logique d'un équipement (Admin)",
    description="Soft-delete: met `is_active=False` et conserve l'historique InfluxDB.",
)
async def supprimer_equipement(
    equipement_id: int,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(admin_requis),
):
    result = await db.execute(
        select(Equipement).where(Equipement.id == equipement_id).where(Equipement.is_active == True)
    )
    eq = result.scalar_one_or_none()
    
    if not eq:
        raise HTTPException(status_code=404, detail="Équipement introuvable ou déjà supprimé")

    # Soft delete pour préserver les TSDB (Influx) et les logs
    eq.is_active = False
    eq.deleted_at = datetime.utcnow()
    
    await db.flush()
    return None