"""
— Routes équipements réseau
GET  /equipements          → liste tous les équipements
GET  /equipements/{id}     → détail + ports
POST /equipements/scan     → lancer scan Nmap (Admin)
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


# Schémas Pydantic
class PortResponse(BaseModel):
    id:        int
    numero:    int
    protocole: str
    service:   Optional[str]
    version:   Optional[str]
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
    os_detecte:  Optional[str]
    dernier_vu:  Optional[datetime]
    created_at:  datetime

    class Config:
        from_attributes = True


class EquipementDetailResponse(EquipementResponse):
    ports: list[PortResponse] = []


class ScanRequest(BaseModel):
    plage: Optional[str] = None   # ex: 192.168.1.0/24 — défaut depuis .env


class ScanResponse(BaseModel):
    plage:                   str
    timestamp:               str
    hotes_detectes:          int
    equipements_sauvegardes: int
    ports_sauvegardes:       int


# GET /equipements — liste 
@router.get(
    "/",
    response_model=list[EquipementResponse],
    summary="Liste tous les équipements",
    description="Retourne l'inventaire réseau complet. Accessible Admin + Technicien."
)
async def lister_equipements(
    statut: Optional[str] = None,
    type:   Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = select(Equipement).order_by(Equipement.adresse_ip)

    if statut:
        query = query.where(Equipement.statut == statut)
    if type:
        query = query.where(Equipement.type == type)

    result = await db.execute(query)
    return result.scalars().all()


# GET /equipements/{id} — détail + ports
@router.get(
    "/{equipement_id}",
    response_model=EquipementDetailResponse,
    summary="Détail d'un équipement + ses ports",
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
    )
    eq = result.scalar_one_or_none()
    if not eq:
        raise HTTPException(status_code=404, detail="Équipement introuvable")
    return eq


# POST /equipements/scan — lancer scan Nmap
@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Lancer un scan réseau Nmap (Admin)",
    description="Lance un scan Nmap sur la plage IP et met à jour l'inventaire. (BF02)"
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