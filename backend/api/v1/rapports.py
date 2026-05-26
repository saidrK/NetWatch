"""
api/v1/rapports.py — Routes rapports
GET  /rapports/                    → liste des rapports
POST /rapports/generer             → générer un rapport (PDF/CSV/Excel)
GET  /rapports/{id}/telecharger   → télécharger un rapport
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgresql import get_db
from models.rapport import Rapport, FormatRapport, TypeGeneration
from models.utilisateur import Utilisateur
from api.v1.utilisateurs import get_current_user

router = APIRouter()


# Schémas Pydantic
class RapportCreate(BaseModel):
    titre: str
    periode_debut: datetime
    periode_fin: datetime
    format: FormatRapport = FormatRapport.PDF


class RapportResponse(BaseModel):
    id: int
    titre: str
    periode_debut: datetime
    periode_fin: datetime
    format: FormatRapport
    type_generation: TypeGeneration
    date_generation: datetime
    chemin_fichier: Optional[str]


# GET /rapports/ — liste des rapports
@router.get(
    "/",
    response_model=list[RapportResponse],
    summary="Lister tous les rapports",
)
async def lister_rapports(
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    """Retourne la liste de tous les rapports générés."""
    result = await db.execute(
        select(Rapport).order_by(Rapport.date_generation.desc())
    )
    rapports = result.scalars().all()
    return rapports


# POST /rapports/generer — générer un rapport
@router.post(
    "/generer",
    response_model=RapportResponse,
    summary="Générer un rapport",
)
async def generer_rapport(
    rapport_data: RapportCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """
    Génère un rapport sur la période spécifiée.
    La génération effective se fait en arrière-plan.
    """
    rapport = Rapport(
        titre=rapport_data.titre,
        periode_debut=rapport_data.periode_debut,
        periode_fin=rapport_data.periode_fin,
        format=rapport_data.format,
        type_generation=TypeGeneration.MANUEL,
        auteur_id=current_user.id,
    )
    
    db.add(rapport)
    await db.commit()
    await db.refresh(rapport)
    
    # Lancer la génération en arrière-plan
    background_tasks.add_task(_generer_fichier, rapport.id, db)
    
    return rapport


# GET /rapports/{id}/telecharger — télécharger un rapport
@router.get(
    "/{id}/telecharger",
    summary="Télécharger un rapport",
)
async def telecharger_rapport(
    id: int,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    """Retourne le fichier du rapport généré."""
    result = await db.execute(select(Rapport).where(Rapport.id == id))
    rapport = result.scalar_one_or_none()
    
    if not rapport:
        raise HTTPException(status_code=404, detail="Rapport non trouvé")
    
    if not rapport.chemin_fichier:
        raise HTTPException(status_code=400, detail="Rapport pas encore généré")
    
    # TODO: Implémenter le téléchargement effectif du fichier
    # Pour l'instant, retourne les métadonnées
    return {
        "id": rapport.id,
        "titre": rapport.titre,
        "format": rapport.format,
        "chemin_fichier": rapport.chemin_fichier,
    }


async def _generer_fichier(rapport_id: int, db: AsyncSession):
    """
    Génère le fichier du rapport en arrière-plan.
    Pour l'instant, c'est un stub - à implémenter avec:
    - PDF: reportlab ou weasyprint
    - Excel: openpyxl ou pandas
    - CSV: module csv
    """
    import logging
    logger = logging.getLogger(__name__)
    
    result = await db.execute(select(Rapport).where(Rapport.id == rapport_id))
    rapport = result.scalar_one_or_none()
    
    if rapport:
        # Stub: simule la génération
        rapport.chemin_fichier = f"/tmp/rapport_{rapport_id}.{rapport.format.value.lower()}"
        await db.commit()
        logger.info(f"✅ Rapport {rapport_id} généré: {rapport.chemin_fichier}")
