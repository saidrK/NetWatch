"""
Configuration centrale de la plateforme
Lit les variables du .env et les expose à toute l'application
"""
from pathlib import Path
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings

_THIS_DIR = Path(__file__).resolve().parent
_PROJECT_ROOT = _THIS_DIR.parent


class Settings(BaseSettings):

    # PostgreSQL (port 5433)
    database_url: str = "postgresql+asyncpg://supervision_user:supervision_pass@localhost:5433/supervision_db"

    # InfluxDB 
    influxdb_url: str    = "http://localhost:8086"
    influxdb_token: str  = ""
    influxdb_org: str    = "supervision"
    influxdb_bucket: str = "metriques"

    # JWT 
    jwt_secret: str       = ""
    jwt_expire_hours: int = 24

    # Prometheus
    prometheus_url: str = "http://localhost:9090"

    # Telegram 
    telegram_token: str   = ""
    telegram_chat_id: str = ""

    # SMTP
    smtp_host: str     = "smtp.gmail.com"
    smtp_port: int     = 587
    smtp_user: str     = ""
    smtp_password: str = ""

    # Scan réseau
    reseau_plage: str = "192.168.1.0/24"
    
    app_name:     str = "Plateforme Supervision Réseau"
    app_version:  str = "1.0.0"
    environment:  str = "development"
    
    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_non_vide(cls, v):
        if not v:
            raise ValueError("JWT_SECRET ne peut pas être vide")
        return v

    class Config:
        # Supporte les deux modes de lancement:
        # - depuis la racine du projet
        # - depuis le dossier backend/
        env_file = (_PROJECT_ROOT / ".env", _THIS_DIR / ".env")
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"   # ignore les variables non déclarées


@lru_cache()
def get_settings() -> Settings:
    """Singleton — une seule instance pour toute l'application."""
    return Settings()
