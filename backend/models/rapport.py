# Rapports PDF/Excel/CSV générés périodiquement
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from database.postgresql import Base


class FormatRapport(str, enum.Enum):
    PDF   = "PDF"
    EXCEL = "EXCEL"
    CSV   = "CSV"

class TypeGeneration(str, enum.Enum):
    AUTOMATIQUE = "AUTOMATIQUE"
    MANUEL      = "MANUEL"


class Rapport(Base):
    __tablename__ = "rapport" 

    id              = Column(Integer, primary_key=True, index=True)
    titre           = Column(String(255), nullable=False)
    periode_debut   = Column(DateTime, nullable=False)
    periode_fin     = Column(DateTime, nullable=False)
    format          = Column(SAEnum(FormatRapport), default=FormatRapport.PDF, nullable=False)
    type_generation = Column(SAEnum(TypeGeneration), default=TypeGeneration.MANUEL, nullable=False)
    chemin_fichier  = Column(String(500), nullable=True)
    date_generation = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    auteur_id       = Column(Integer, ForeignKey("utilisateur.id", ondelete="SET NULL"), nullable=True)

    auteur = relationship("Utilisateur", back_populates="rapports", foreign_keys=[auteur_id])