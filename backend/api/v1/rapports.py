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
    """Génère un rapport au format PDF riche."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from models.alerte import Alerte, NiveauAlerte
    from models.equipement import Equipement

    doc = SimpleDocTemplate(
        str(file_path), pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
        title=rapport.titre, author="NetWatch Platform"
    )
    W = A4[0] - 4*cm
    styles = getSampleStyleSheet()
    
    # Couleurs du thème
    DARK_BLUE = colors.HexColor('#0a1628')
    MID_BLUE = colors.HexColor('#1e3a5f')
    CYAN = colors.HexColor('#00d4ff')
    WHITE = colors.white
    RED_ALERT = colors.HexColor('#cc2200')
    YELLOW_WARN = colors.HexColor('#f0a500')
    GREEN_OK = colors.HexColor('#00aa55')
    LIGHT_GREY = colors.HexColor('#f2f4f7')
    MED_GREY = colors.HexColor('#d0d7e2')

    s_title = ParagraphStyle('Title', fontSize=26, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER)
    s_sub = ParagraphStyle('Sub', fontSize=12, textColor=CYAN, fontName='Helvetica', alignment=TA_CENTER, spaceAfter=6)
    s_h1 = ParagraphStyle('H1', fontSize=14, textColor=DARK_BLUE, fontName='Helvetica-Bold', spaceBefore=15, spaceAfter=10)
    s_body = ParagraphStyle('Body', fontSize=10, textColor=colors.black, fontName='Helvetica', spaceAfter=6, leading=14)

    def head_box(txt):
        t = Table([[Paragraph(txt, ParagraphStyle('HB', fontSize=12, textColor=WHITE, fontName='Helvetica-Bold'))]], colWidths=[W])
        t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), DARK_BLUE), ('PADDING', (0,0), (-1,-1), 8)]))
        return t

    result_alertes = await db.execute(
        select(Alerte).where(Alerte.timestamp >= rapport.periode_debut, Alerte.timestamp <= rapport.periode_fin).order_by(Alerte.timestamp.desc())
    )
    alertes = result_alertes.scalars().all()
    result_equipements = await db.execute(select(Equipement))
    equipements = result_equipements.scalars().all()

    nb_critique = sum(1 for a in alertes if a.niveau == NiveauAlerte.CRITIQUE)
    nb_warning = sum(1 for a in alertes if a.niveau == NiveauAlerte.WARNING)
    eq_en_ligne = sum(1 for e in equipements if e.statut.value == 'EN_LIGNE')

    story = []

    # --- COVER PAGE ---
    cover_bg = Table([[ 
        Paragraph("NETWATCH", s_title),
        Paragraph("Plateforme Intelligente de Supervision Réseau", s_sub),
        Spacer(1, 1*cm),
        Paragraph("RAPPORT DE SUPERVISION", ParagraphStyle('RT', fontSize=18, textColor=CYAN, alignment=TA_CENTER)),
        Paragraph(rapport.titre.upper(), ParagraphStyle('RN', fontSize=22, textColor=WHITE, alignment=TA_CENTER, spaceBefore=10)),
    ]], colWidths=[W])
    cover_bg.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,-1), DARK_BLUE),
        ('PADDING', (0,0),(-1,-1), 40),
        ('ROUNDEDCORNERS', [8]),
    ]))
    story.append(cover_bg)
    story.append(Spacer(1, 1*cm))

    meta_data = [
        ['Période analysée', f"{rapport.periode_debut.strftime('%d/%m/%Y %H:%M')}  →  {rapport.periode_fin.strftime('%d/%m/%Y %H:%M')}"],
        ['Date de génération', rapport.date_generation.strftime('%d/%m/%Y à %H:%M:%S')],
        ['Format', rapport.format.value],
    ]
    meta_table = Table(meta_data, colWidths=[5*cm, W-5*cm])
    meta_table.setStyle(TableStyle([
        ('FONTNAME', (0,0),(0,-1), 'Helvetica-Bold'),
        ('BACKGROUND',(0,0),(-1,-1), LIGHT_GREY),
        ('GRID', (0,0),(-1,-1), 0.5, MED_GREY),
        ('PADDING', (0,0),(-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(PageBreak())

    # --- 1. RESUME EXECUTIF ---
    story.append(head_box("1. RÉSUMÉ EXÉCUTIF"))
    story.append(Spacer(1, 0.5*cm))
    kpi_data = [
        ['INDICATEUR', 'VALEUR', 'ÉTAT'],
        ['Équipements supervisés', str(len(equipements)), '—'],
        ['Équipements EN LIGNE', str(eq_en_ligne), '✓ OK' if eq_en_ligne == len(equipements) else '⚠ Partiel'],
        ['Total alertes', str(len(alertes)), '—'],
        ['Alertes CRITIQUES', str(nb_critique), '🔴' if nb_critique > 0 else '✓'],
        ['Alertes WARNING', str(nb_warning), '🟡' if nb_warning > 0 else '✓'],
    ]
    kpi_table = Table(kpi_data, colWidths=[7*cm, 4*cm, W-11*cm])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,0), MID_BLUE), ('TEXTCOLOR', (0,0),(-1,0), WHITE),
        ('FONTNAME', (0,0),(-1,0), 'Helvetica-Bold'),
        ('GRID', (0,0),(-1,-1), 0.5, MED_GREY),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
        ('PADDING', (0,0),(-1,-1), 6),
        ('ALIGN', (1,0),(-1,-1), 'CENTER'),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 1*cm))

    # --- 2. INVENTAIRE ---
    story.append(head_box("2. INVENTAIRE DES ÉQUIPEMENTS"))
    story.append(Spacer(1, 0.5*cm))
    eq_data = [['ID', 'IP', 'HOSTNAME', 'TYPE', 'STATUT']]
    for eq in equipements:
        eq_data.append([str(eq.id), eq.adresse_ip, eq.hostname or '—', eq.type.value if hasattr(eq.type, 'value') else str(eq.type), eq.statut.value if hasattr(eq.statut, 'value') else str(eq.statut)])
    eq_table = Table(eq_data, colWidths=[1.5*cm, 3.5*cm, 4.5*cm, 3*cm, 3.5*cm])
    eq_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0),(-1,0), MID_BLUE), ('TEXTCOLOR', (0,0),(-1,0), WHITE),
        ('FONTNAME', (0,0),(-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0),(-1,-1), 8),
        ('GRID', (0,0),(-1,-1), 0.5, MED_GREY), ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
        ('PADDING', (0,0),(-1,-1), 5), ('ALIGN', (0,0),(0,-1), 'CENTER'),
    ]))
    story.append(eq_table)
    story.append(Spacer(1, 1*cm))

    # --- 3. ALERTES ---
    story.append(head_box("3. ANALYSE DES ALERTES (50 Dernières)"))
    story.append(Spacer(1, 0.5*cm))
    if alertes:
        al_data = [['DATE/HEURE', 'NIVEAU', 'EQ_ID', 'CPU', 'RAM', 'SCORE IA']]
        for a in alertes[:50]:
            al_data.append([
                a.timestamp.strftime('%d/%m %H:%M'), a.niveau.value, str(a.equipement_id),
                f'{a.valeur_cpu:.1f}%', f'{a.valeur_ram:.1f}%', f'{a.score_anomalie:.3f}'
            ])
        al_table = Table(al_data, colWidths=[3*cm, 2.5*cm, 2*cm, 2*cm, 2*cm, 2.5*cm])
        al_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0),(-1,0), colors.HexColor('#2c3e50')), ('TEXTCOLOR', (0,0),(-1,0), WHITE),
            ('FONTNAME', (0,0),(-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0),(-1,-1), 8),
            ('GRID', (0,0),(-1,-1), 0.4, MED_GREY), ('ROWBACKGROUNDS',(0,1),(-1,-1), [WHITE, LIGHT_GREY]),
            ('PADDING', (0,0),(-1,-1), 5), ('ALIGN', (1,0),(-1,-1), 'CENTER'),
        ]))
        story.append(al_table)
    else:
        story.append(Paragraph("Aucune alerte enregistrée sur cette période.", s_body))
    
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width=W, thickness=1, color=MID_BLUE))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph("NetWatch Platform v1.0 • PFE 2025/2026 — FSBM, Casablanca", ParagraphStyle('Footer', fontSize=7, textColor=colors.grey, alignment=TA_CENTER)))

    doc.build(story)
