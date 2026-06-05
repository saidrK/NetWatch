# Utilisateur (abstrait) + Admin + Technicien
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from database.postgresql import Base


class RoleUtilisateur(str, enum.Enum):
    ADMINISTRATEUR = "ADMINISTRATEUR"
    TECHNICIEN     = "TECHNICIEN"


class Utilisateur(Base):
    __tablename__ = "utilisateur"

    id                 = Column(Integer, primary_key=True, index=True)
    nom                = Column(String(100), nullable=False)
    email              = Column(String(255), unique=True, nullable=False, index=True)
    mot_de_passe_hash  = Column(String(255), nullable=False)
    actif              = Column(Boolean, default=True, nullable=False)
    role               = Column(SAEnum(RoleUtilisateur, name="role_enum"), nullable=False)
    derniere_connexion = Column(DateTime, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow, nullable=False)

    __mapper_args__ = {
        "polymorphic_on":       role,
        "polymorphic_identity": None,
    }

    historique_connexions = relationship("HistoriqueConnexion", back_populates="utilisateur", cascade="all, delete-orphan")
    alertes_acquittees    = relationship("Alerte", back_populates="acquitte_par", foreign_keys="Alerte.acquitte_par_id")
    rapports              = relationship("Rapport", back_populates="auteur", foreign_keys="Rapport.auteur_id")


class Administrateur(Utilisateur):
    __tablename__ = "administrateur"
    id = Column(Integer, ForeignKey("utilisateur.id"), primary_key=True)
    __mapper_args__ = {"polymorphic_identity": RoleUtilisateur.ADMINISTRATEUR}


class Technicien(Utilisateur):
    __tablename__ = "technicien"
    id = Column(Integer, ForeignKey("utilisateur.id"), primary_key=True)
    __mapper_args__ = {"polymorphic_identity": RoleUtilisateur.TECHNICIEN}