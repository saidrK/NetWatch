# Equipement réseau + Ports
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from database.postgresql import Base


class StatutEquipement(str, enum.Enum):
    EN_LIGNE   = "EN_LIGNE"
    HORS_LIGNE = "HORS_LIGNE"
    INCONNU    = "INCONNU"

class TypeEquipement(str, enum.Enum):
    SERVEUR    = "SERVEUR"
    ROUTEUR    = "ROUTEUR"
    SWITCH     = "SWITCH"
    PC         = "PC"
    IMPRIMANTE = "IMPRIMANTE"
    INCONNU    = "INCONNU"


class Equipement(Base):
    __tablename__ = "equipement"

    id          = Column(Integer, primary_key=True, index=True)
    adresse_ip  = Column(String(45), unique=True, nullable=False, index=True)
    adresse_mac = Column(String(17), nullable=True)
    hostname    = Column(String(255), nullable=True)
    type        = Column(SAEnum(TypeEquipement), default=TypeEquipement.INCONNU, nullable=False)
    dernier_vu  = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    seuil_cpu_warning   = Column(Float, default=70.0, nullable=False)
    seuil_cpu_critique  = Column(Float, default=90.0, nullable=False)
    seuil_ram_warning   = Column(Float, default=75.0, nullable=False)
    seuil_ram_critique  = Column(Float, default=90.0, nullable=False)
    seuil_bp_warning    = Column(Float, default=800.0, nullable=False)
    seuil_bp_critique   = Column(Float, default=950.0, nullable=False)
    status              = Column(SAEnum(StatutEquipement), default=StatutEquipement.INCONNU, nullable=False)
    os_detecte          = Column(String(255), nullable=True)

    ports   = relationship("Port",  back_populates="equipement", cascade="all, delete-orphan")
    alertes = relationship("Alerte", back_populates="equipement", cascade="all, delete-orphan")


class Port(Base):
    __tablename__ = "port"

    id            = Column(Integer, primary_key=True, index=True)
    numero        = Column(Integer, nullable=False)
    protocole     = Column(String(10), default="TCP", nullable=False)
    service       = Column(String(100), nullable=True)
    ouvert        = Column(Boolean, default=True, nullable=False)
    equipement_id = Column(Integer, ForeignKey("equipement.id", ondelete="CASCADE"), nullable=False)
    service_version       = Column(String(255), nullable=True)

    equipement = relationship("Equipement", back_populates="ports")