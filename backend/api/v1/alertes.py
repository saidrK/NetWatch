"""
— Routes alertes + acquittement
GET    /alertes              -> liste (filtre niveau, acquittée)
GET    /alertes/{id}         -> détail
PUT    /alertes/{id}/acquitter -> acquitter un incident (BF05)
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database.postgresql import get_db
from models.alerte import Alerte, NiveauAlerte
from models.utilisateur import Utilisateur
from api.v1.utilisateurs import get_current_user

router = APIRouter()


# Schémas Pydantic
class AlerteResponse(BaseModel):
    id:              int
    message:         str
    niveau:          str
    score_anomalie:  Optional[float]
    valeur_cpu:       Optional[float]
    valeur_ram:       Optional[float]
    valeur_bp:        Optional[float]
    acquittee:       bool
    acquitte_le:     Optional[datetime]
    acquitte_par_id: Optional[int]
    timestamp:       datetime
    equipement_id:   int

    class Config:
        from_attributes = True


# GET /alertes — liste
@router.get(
    "/",
    response_model=list[AlerteResponse],
    summary="Liste des alertes",
)
async def lister_alertes(
    niveau:    Optional[str]  = None,
    acquittee: Optional[bool] = None,
    equipement_id: Optional[int] = None,
    limite:    int = 50,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    query = select(Alerte).order_by(Alerte.timestamp.desc()).limit(limite)

    if niveau:
        query = query.where(Alerte.niveau == niveau)
    if acquittee is not None:
        query = query.where(Alerte.acquittee == acquittee)
    if equipement_id:
        query = query.where(Alerte.equipement_id == equipement_id)

    result = await db.execute(query)
    return result.scalars().all()


# GET /alertes/{id} — détail
@router.get(
    "/{alerte_id}",
    response_model=AlerteResponse,
    summary="Détail d'une alerte",
)
async def get_alerte(
    alerte_id: int,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(Alerte).where(Alerte.id == alerte_id)
    )
    alerte = result.scalar_one_or_none()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    return alerte


# PUT /alertes/{id}/acquitter
@router.put(
    "/{alerte_id}/acquitter",
    response_model=AlerteResponse,
    summary="Acquitter un incident (BF05)",
    description="Marque l'alerte comme traitée. Admin ou Technicien."
)
async def acquitter_alerte(
    alerte_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    result = await db.execute(
        select(Alerte).where(Alerte.id == alerte_id)
    )
    alerte = result.scalar_one_or_none()
    if not alerte:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    if alerte.acquittee:
        raise HTTPException(status_code=400, detail="Alerte déjà acquittée")

    alerte.acquittee       = True
    alerte.acquitte_le     = datetime.utcnow()
    alerte.acquitte_par_id = current_user.id

    await db.flush()
    await db.refresh(alerte)
    return alerte