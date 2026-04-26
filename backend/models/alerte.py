# Incidents détectés par l'IA 
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from database.postgresql import Base


class NiveauAlerte(str, enum.Enum):
    NORMAL   = "NORMAL"
    WARNING  = "WARNING"
    CRITIQUE = "CRITIQUE"


class Alerte(Base):
    __tablename__ = "alerte"

    id              = Column(Integer, primary_key=True, index=True)
    message         = Column(String(500), nullable=False)
    niveau          = Column(SAEnum(NiveauAlerte), nullable=False, index=True)
    score_anomalie  = Column(Float, nullable=False)
    valeur_cpu       = Column(Float, nullable=False)
    valeur_ram       = Column(Float, nullable=False)
    valeur_bp        = Column(Float, nullable=False)
    acquittee       = Column(Boolean, default=False, nullable=False)
    acquitte_le     = Column(DateTime, nullable=True)
    acquitte_par_id = Column(Integer, ForeignKey("utilisateur.id", ondelete="SET NULL"), nullable=True)
    timestamp       = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    equipement_id   = Column(Integer, ForeignKey("equipement.id", ondelete="CASCADE"), nullable=False)

    equipement    = relationship("Equipement", back_populates="alertes")
    acquitte_par  = relationship("Utilisateur", back_populates="alertes_acquittees", foreign_keys=[acquitte_par_id])
    notifications = relationship("Notification", back_populates="alerte", cascade="all, delete-orphan")