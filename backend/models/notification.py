# Canal d'envoi Telegram / Email
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.postgresql import Base


class Canal(str, enum.Enum):
    TELEGRAM = "TELEGRAM"
    EMAIL    = "EMAIL"


class Notification(Base):
    __tablename__ = "notification"

    id           = Column(Integer, primary_key=True, index=True)
    canal        = Column(SAEnum(Canal), nullable=False)
    destinataire = Column(String(255), nullable=False)
    contenu      = Column(Text, nullable=False)
    envoye       = Column(Boolean, default=False, nullable=False)
    envoye_le    = Column(DateTime, nullable=True)
    # erreur       = Column(String(500), nullable=True)
    alerte_id    = Column(Integer, ForeignKey("alerte.id", ondelete="CASCADE"), nullable=False)

    alerte = relationship("Alerte", back_populates="notifications") 