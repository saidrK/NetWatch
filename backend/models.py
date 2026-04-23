from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# 🖥️ Equipement réseau
class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    ip_address = Column(String, unique=True)
    status = Column(String, default="online")

    metrics = relationship("Metric", back_populates="device")


# 📊 Métriques
class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True, index=True)
    cpu = Column(Float)
    ram = Column(Float)
    bandwidth = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    device_id = Column(Integer, ForeignKey("devices.id"))
    device = relationship("Device", back_populates="metrics")


# 🚨 Alertes
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String)
    level = Column(String)  # normal / warning / critical
    timestamp = Column(DateTime, default=datetime.utcnow)


# 👤 Utilisateurs
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    password = Column(String)
    role = Column(String)  # admin / tech / viewer

