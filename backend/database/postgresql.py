"""
database/postgresql.py — Connexion PostgreSQL async via SQLAlchemy
Gère le pool de connexions et la session async pour FastAPI
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
import logging

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Moteur async SQLAlchemy 
engine = create_async_engine(
    settings.database_url,
    echo=(settings.environment == "development"),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,          # vérifie la connexion avant utilisation
    pool_recycle=3600,           # recycle les connexions après 1h
)

# Session factory 
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# Classe de base pour tous les modèles
class Base(DeclarativeBase):
    pass


# Dépendance FastAPI — injection de session
async def get_db() -> AsyncSession:
    """
    Générateur de session DB pour l'injection de dépendances FastAPI.
    Garantit la fermeture de session même en cas d'exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Initialisation des tables
async def init_db():
    """Crée toutes les tables en base si elles n'existent pas."""
    # Import ici pour éviter les imports circulaires
    from backend.models import (  
        utilisateur, equipement,
        alerte, notification, rapport, historique_connexion
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Base de données PostgreSQL initialisée")


async def close_db():
    """Ferme le pool de connexions proprement."""
    await engine.dispose()
    logger.info("🔌 Connexion PostgreSQL fermée")
