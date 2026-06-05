# Journal d'audit connexions
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from database.postgresql import Base


class StatutConnexion(str, enum.Enum):
    SUCCES = "SUCCES"
    ECHEC  = "ECHEC"


class HistoriqueConnexion(Base):
    __tablename__ = "historique_connexion" 

    id             = Column(Integer, primary_key=True, index=True)
    date_connexion = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    adresse_ip     = Column(String(45), nullable=False)
    statut         = Column(SAEnum(StatutConnexion, name='statut_connexion_enum'), nullable=False)
    utilisateur_id = Column(Integer, ForeignKey("utilisateur.id", ondelete="CASCADE"), nullable=False)

    utilisateur = relationship("Utilisateur", back_populates="historique_connexions")