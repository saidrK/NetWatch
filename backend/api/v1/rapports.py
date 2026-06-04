"""
api/v1/rapports.py — Routes rapports
GET  /rapports/                    → liste des rapports
POST /rapports/generer             → générer un rapport (PDF/CSV/Excel)
GET  /rapports/{id}/telecharger   → télécharger un rapport
"""
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path
import csv
import io

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgresql import get_db, AsyncSessionLocal
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
    # Normalise en naive UTC (strip tzinfo) pour correspondre aux colonnes
    # PostgreSQL TIMESTAMP WITHOUT TIME ZONE
    def _to_naive_utc(dt: datetime) -> datetime:
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt

    rapport = Rapport(
        titre=rapport_data.titre,
        periode_debut=_to_naive_utc(rapport_data.periode_debut),
        periode_fin=_to_naive_utc(rapport_data.periode_fin),
        format=rapport_data.format,
        type_generation=TypeGeneration.MANUEL,
        auteur_id=current_user.id,
    )
    
    db.add(rapport)
    await db.commit()
    await db.refresh(rapport)
    
    # Lancer la génération en arrière-plan avec sa PROPRE session DB
    background_tasks.add_task(_generer_fichier, rapport.id)
    
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

    file_path = Path(rapport.chemin_fichier)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier du rapport non trouvé")

    # Déterminer le type MIME selon le format
    media_type = "application/pdf" if rapport.format == FormatRapport.PDF else \
                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if rapport.format == FormatRapport.EXCEL else \
                 "text/csv"

    filename = f"rapport_{rapport.titre}_{rapport.date_generation.strftime('%Y%m%d_%H%M%S')}.{rapport.format.value.lower()}"

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=filename
    )


async def _generer_fichier(rapport_id: int):
    """
    Génère le fichier du rapport en arrière-plan.
    Ouvre sa PROPRE session DB (la session de requête est déjà fermée).
    """
    import logging
    logger = logging.getLogger(__name__)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Rapport).where(Rapport.id == rapport_id))
        rapport = result.scalar_one_or_none()

        if not rapport:
            logger.error(f"❌ Rapport {rapport_id} non trouvé")
            return

        try:
            Path("/tmp").mkdir(exist_ok=True)
            file_path = Path(f"/tmp/rapport_{rapport_id}.{rapport.format.value.lower()}")

            if rapport.format == FormatRapport.CSV:
                await _generer_csv(rapport, db, file_path)
            elif rapport.format == FormatRapport.EXCEL:
                await _generer_excel(rapport, db, file_path)
            elif rapport.format == FormatRapport.PDF:
                await _generer_pdf(rapport, db, file_path)

        writer = csv.writer(f)

        # En-tête
        writer.writerow(['RAPPORT', rapport.titre])
        writer.writerow(['Période', rapport.periode_debut, 'à', rapport.periode_fin])
        writer.writerow(['Date génération', rapport.date_generation])
        writer.writerow([])

        # Statistiques
        writer.writerow(['STATISTIQUES'])
        writer.writerow(['Nombre d\'alertes', len(alertes)])
        writer.writerow(['Nombre d\'équipements', len(equipements)])
        writer.writerow(['Alertes critiques', sum(1 for a in alertes if a.niveau.value == 'CRITIQUE')])
        writer.writerow([])

        # Liste des alertes
        writer.writerow(['ALERTE', 'NIVEAU', 'ÉQUIPEMENT', 'DATE', 'MESSAGE'])
        for alerte in alertes:
            writer.writerow([
                alerte.id,
                alerte.niveau.value,
                alerte.equipement_id or 'N/A',
                alerte.timestamp,
                alerte.message
            ])

        # Liste des équipements
        writer.writerow([])
        writer.writerow(['ÉQUIPEMENTS'])
        writer.writerow(['ID', 'HOSTNAME', 'IP', 'TYPE', 'STATUT'])
        for eq in equipements:
            writer.writerow([
                eq.id,
                eq.hostname or 'N/A',
                eq.adresse_ip,
                eq.type.value if hasattr(eq.type, 'value') else str(eq.type),
                eq.statut.value if hasattr(eq.statut, 'value') else str(eq.statut)
            ])


async def _generer_excel(rapport: Rapport, db: AsyncSession, file_path: Path):
    """Génère un rapport au format Excel."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from models.alerte import Alerte
    from models.equipement import Equipement

    wb = Workbook()
    ws = wb.active
    ws.title = "Rapport"

    # En-tête
    ws['A1'] = f"RAPPORT: {rapport.titre}"
    ws['A1'].font = Font(bold=True, size=14)
    ws['A2'] = f"Période: {rapport.periode_debut} à {rapport.periode_fin}"
    ws['A3'] = f"Date génération: {rapport.date_generation}"

    # Récupérer les données
    result_alertes = await db.execute(
        select(Alerte).where(
            Alerte.timestamp >= rapport.periode_debut,
            Alerte.timestamp <= rapport.periode_fin
        )
    )
    alertes = result_alertes.scalars().all()

    result_equipements = await db.execute(select(Equipement))
    equipements = result_equipements.scalars().all()

    row = 5

    # Statistiques
    ws[f'A{row}'] = "STATISTIQUES"
    ws[f'A{row}'].font = Font(bold=True)
    row += 1
    ws[f'A{row}'] = "Nombre d'alertes"
    ws[f'B{row}'] = len(alertes)
    row += 1
    ws[f'A{row}'] = "Nombre d'équipements"
    ws[f'B{row}'] = len(equipements)
    row += 1
    ws[f'A{row}'] = "Alertes critiques"
    ws[f'B{row}'] = sum(1 for a in alertes if a.niveau.value == 'CRITIQUE')
    row += 2

    # Liste des alertes
    ws[f'A{row}'] = "ALERTE"
    ws[f'B{row}'] = "NIVEAU"
    ws[f'C{row}'] = "ÉQUIPEMENT"
    ws[f'D{row}'] = "DATE"
    ws[f'E{row}'] = "MESSAGE"
    for col in ['A', 'B', 'C', 'D', 'E']:
        ws[f'{col}{row}'].font = Font(bold=True)
        ws[f'{col}{row}'].fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")
    row += 1

    for alerte in alertes:
        ws[f'A{row}'] = alerte.id
        ws[f'B{row}'] = alerte.niveau.value
        ws[f'C{row}'] = alerte.equipement_id or 'N/A'
        ws[f'D{row}'] = alerte.timestamp
        ws[f'E{row}'] = alerte.message
        row += 1

    row += 1

    # Liste des équipements
    ws[f'A{row}'] = "ÉQUIPEMENTS"
    ws[f'A{row}'].font = Font(bold=True)
    row += 1
    ws[f'A{row}'] = "ID"
    ws[f'B{row}'] = "HOSTNAME"
    ws[f'C{row}'] = "IP"
    ws[f'D{row}'] = "TYPE"
    ws[f'E{row}'] = "STATUT"
    for col in ['A', 'B', 'C', 'D', 'E']:
        ws[f'{col}{row}'].font = Font(bold=True)
        ws[f'{col}{row}'].fill = PatternFill(start_color="DDDDDD", end_color="DDDDDD", fill_type="solid")
    row += 1

    for eq in equipements:
        ws[f'A{row}'] = eq.id
        ws[f'B{row}'] = eq.hostname or 'N/A'
        ws[f'C{row}'] = eq.adresse_ip
        ws[f'D{row}'] = eq.type.value if hasattr(eq.type, 'value') else str(eq.type)
        ws[f'E{row}'] = eq.statut.value if hasattr(eq.statut, 'value') else str(eq.statut)
        row += 1

    wb.save(file_path)


async def _generer_pdf(rapport: Rapport, db: AsyncSession, file_path: Path):
    """Génère un rapport au format PDF."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from models.alerte import Alerte
    from models.equipement import Equipement

    doc = SimpleDocTemplate(str(file_path), pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # En-tête
    story.append(Paragraph(f"RAPPORT: {rapport.titre}", styles['Title']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f"Période: {rapport.periode_debut} à {rapport.periode_fin}", styles['Normal']))
    story.append(Paragraph(f"Date génération: {rapport.date_generation}", styles['Normal']))
    story.append(Spacer(1, 24))

    # Récupérer les données
    result_alertes = await db.execute(
        select(Alerte).where(
            Alerte.timestamp >= rapport.periode_debut,
            Alerte.timestamp <= rapport.periode_fin
        )
    )
    alertes = result_alertes.scalars().all()

    result_equipements = await db.execute(select(Equipement))
    equipements = result_equipements.scalars().all()

    # Statistiques
    story.append(Paragraph("STATISTIQUES", styles['Heading2']))
    stats_data = [
        ['Nombre d\'alertes', str(len(alertes))],
        ['Nombre d\'équipements', str(len(equipements))],
        ['Alertes critiques', str(sum(1 for a in alertes if a.niveau.value == 'CRITIQUE'))],
    ]
    stats_table = Table(stats_data, colWidths=[200, 100])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('BACKGROUND', (1, 0), (1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 24))

    # Liste des alertes
    story.append(Paragraph("ALERTE", styles['Heading2']))
    alertes_data = [['ID', 'NIVEAU', 'ÉQUIPEMENT', 'DATE', 'MESSAGE']]
    for alerte in alertes:
        alertes_data.append([
            str(alerte.id),
            alerte.niveau.value,
            str(alerte.equipement_id) if alerte.equipement_id else 'N/A',
            str(alerte.timestamp),
            alerte.message[:50] + '...' if len(alerte.message) > 50 else alerte.message
        ])

    if len(alertes_data) > 1:
        alertes_table = Table(alertes_data, colWidths=[40, 60, 60, 80, 200])
        alertes_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        story.append(alertes_table)
    else:
        story.append(Paragraph("Aucune alerte sur cette période.", styles['Normal']))

    story.append(Spacer(1, 24))

    # Liste des équipements
    story.append(Paragraph("ÉQUIPEMENTS", styles['Heading2']))
    equipements_data = [['ID', 'HOSTNAME', 'IP', 'TYPE', 'STATUT']]
    for eq in equipements:
        equipements_data.append([
            str(eq.id),
            eq.hostname or 'N/A',
            eq.adresse_ip,
            eq.type.value if hasattr(eq.type, 'value') else str(eq.type),
            eq.statut.value if hasattr(eq.statut, 'value') else str(eq.statut)
        ])

    equipements_table = Table(equipements_data, colWidths=[40, 100, 100, 80, 80])
    equipements_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    story.append(equipements_table)

    doc.build(story)
