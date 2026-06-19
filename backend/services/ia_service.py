"""
— Détection d'anomalies via Isolation Forest

Flux :
  1. Lire les métriques depuis InfluxDB
  2. Entraîner / charger le modèle Isolation Forest
  3. Prédire : NORMAL / WARNING / CRITIQUE
  4. Créer une Alerte dans PostgreSQL si anomalie détectée
"""
import logging
import os
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from database.influxdb import InfluxDBService, Metrique
from models.alerte import Alerte, NiveauAlerte
from models.equipement import Equipement

logger   = logging.getLogger(__name__)
settings = get_settings()

# Chemin du modèle sauvegardé
MODEL_PATH = Path("/app/rapports/isolation_forest.pkl")


# Conversion métrique -> vecteur numpy
def _metrique_to_vector(m: Metrique) -> list[float]:
    """
    Transforme une métrique en vecteur de features pour l'IA.
    Features : [cpu_usage, ram_usage, bp_entrant, bp_sortant, disponible]
    """
    return [
        m.cpu_usage,
        m.ram_usage,
        m.bp_entrant,
        m.bp_sortant,
        float(m.disponible),
    ]


# Classifier le score en niveau d'alerte
def _classifier_niveau(score: float) -> NiveauAlerte:
    """
    Isolation Forest retourne un score négatif si anomalie.
    Plus le score est négatif, plus l'anomalie est sévère.
      score > -0.1  -> NORMAL
      score > -0.3  -> WARNING
      score ≤ -0.3  -> CRITIQUE
    """
    """
    if score > -0.1:
        return NiveauAlerte.NORMAL
    elif score > -0.3:
        return NiveauAlerte.WARNING
    else:
        return NiveauAlerte.CRITIQUE
    """
    # juste pour le teste
    if score > -0.05:
        return NiveauAlerte.NORMAL
    elif score > -0.15:
        return NiveauAlerte.WARNING
    else:
        return NiveauAlerte.CRITIQUE

def _classifier_niveau_normalise(score: float) -> NiveauAlerte:
    """
    Score normalisé sur [-1, +1] :
       score < 0  -> NORMAL
       0 < score < 0.5 -> WARNING
       score >= 0.5 -> CRITIQUE
    """
    if score < 0:
        return NiveauAlerte.NORMAL
    elif score < 0.5:
        return NiveauAlerte.WARNING
    else:
        return NiveauAlerte.CRITIQUE

# Service IA
class IAService:

    def __init__(self):
        self.model: IsolationForest = None
        self._charger_modele()

    # Charger ou initialiser le modèle
    def _charger_modele(self):
        if MODEL_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                logger.info("✅ Modèle Isolation Forest chargé depuis le disque")
                return
            except Exception as e:
                logger.warning(f"⚠️ Impossible de charger le modèle : {e}")

        # Modèle vierge — sera entraîné à la première collecte
        self.model = IsolationForest(
            contamination=settings.ia_contamination,  # 5% d'anomalies attendues
            n_estimators=100,
            random_state=42,
        )
        logger.info("🆕 Nouveau modèle Isolation Forest initialisé")

    # Entraîner le modèle
    async def entrainer(self, metriques: list[Metrique]) -> bool:
        """
        Entraîne le modèle sur l'historique des métriques.
        Minimum 10 échantillons requis.
        """
        if len(metriques) < 10:
            logger.warning(f"⚠️ Pas assez de données pour entraîner ({len(metriques)} échantillons)")
            return False

        X = np.array([_metrique_to_vector(m) for m in metriques])
        self.model.fit(X)

        # Sauvegarder le modèle
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        logger.info(f"✅ Modèle entraîné sur {len(metriques)} échantillons et sauvegardé")
        return True

    # Analyser une métrique 
    def analyser(self, metrique: Metrique) -> tuple[NiveauAlerte, float]:
        """
        Analyse une métrique et retourne (niveau, score).
        Si le modèle n'est pas encore entraîné → seuils fixes.
        """
        try:
            X = np.array([_metrique_to_vector(metrique)])
            # score = float(self.model.score_samples(X)[0])
            raw_score = float(self.model.score_samples(X)[0])
            # Normaliser : Isolation Forest donne [-0.5, 0]
            # On mappe vers [-1, +1] pour le frontend
            # Plus le score brut est négatif → plus anormal → score normalisé positif
            score_normalise = -raw_score * 4.0
            score_normalise = max(-1.0, min(1.0, score_normalise))
            niveau = _classifier_niveau(score_normalise)
            return niveau, score_normalise
        except Exception:
            # Modèle pas encore entraîné → seuils fixes de secours
            return self._analyser_seuils_fixes(metrique), 0.0

    def _analyser_seuils_fixes(self, m: Metrique) -> NiveauAlerte:
        """Détection par seuils fixes — utilisée avant l'entraînement IA."""
        if m.cpu_usage > 90 or m.ram_usage > 90 or not m.disponible:
            return NiveauAlerte.CRITIQUE
        if m.cpu_usage > 75 or m.ram_usage > 75:
            return NiveauAlerte.WARNING
        return NiveauAlerte.NORMAL

    # Pipeline complet : analyser + créer alerte 
    async def analyser_et_alerter(
        self,
        db: AsyncSession,
        metrique: Metrique,
    ) -> Alerte | None:
        """
        Analyse la métrique et crée une Alerte en DB si WARNING ou CRITIQUE.
        Retourne l'alerte créée ou None si NORMAL.
        """
        niveau, score = self.analyser(metrique)

        if niveau == NiveauAlerte.NORMAL:
            return None

        # Vérifier que l'équipement existe
        result = await db.execute(
            select(Equipement).where(Equipement.id == metrique.equipement_id)
        )
        eq = result.scalar_one_or_none()
        if not eq:
            return None

        # Créer l'alerte
        alerte = Alerte(
            equipement_id=metrique.equipement_id,
            niveau=niveau,
            score_anomalie=score,
            valeur_cpu=metrique.cpu_usage,
            valeur_ram=metrique.ram_usage,
            valeur_bp=metrique.bp_entrant + metrique.bp_sortant,
            message=(
                f"Anomalie {niveau.value} détectée sur {eq.hostname or eq.adresse_ip} — "
                f"CPU: {metrique.cpu_usage:.1f}% | RAM: {metrique.ram_usage:.1f}% | "
                f"BP: {metrique.bp_entrant:.1f}/{metrique.bp_sortant:.1f} Mbps"
            ),
            timestamp=datetime.utcnow(),
        )
        db.add(alerte)
        await db.flush()
        await db.refresh(alerte)

        logger.warning(
            f"🚨 Alerte {niveau.value} — {eq.hostname or eq.adresse_ip} "
            f"(score={score:.3f})"
        )
        return alerte


# Singleton
_ia_service: IAService = None

def get_ia_service() -> IAService:
    global _ia_service
    if _ia_service is None:
        _ia_service = IAService()
    return _ia_service
