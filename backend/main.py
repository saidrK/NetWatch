"""
main.py — Point d'entrée de l'API FastAPI
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from database.postgresql import init_db, close_db

# Logging 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# Lifespan (startup / shutdown) 
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialisation et nettoyage des ressources au démarrage/arrêt."""
    # Startup
    logger.info("🚀 Démarrage de la plateforme de supervision réseau...")
    await init_db()
    logger.info("✅ PostgreSQL initialisé")

    logger.info(f"🌍 Environnement : {settings.environment}")

    yield  # L'application tourne ici

    # Shutdown 
    logger.info("🛑 Arrêt de la plateforme...")
    await close_db()

    logger.info("✅ Ressources libérées proprement")


# Application FastAPI 
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "API REST de la Plateforme Intelligente de Supervision Réseau — "
        "Faculté des Sciences Ben M'Sik, Université Hassan II de Casablanca. "
        "Détection d'anomalies par IA (Isolation Forest) + Dashboard temps réel."
    ),
    docs_url="/api/docs",           # Swagger UI
    redoc_url="/api/redoc",         # ReDoc
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # Frontend React (dev)
        "http://frontend:80",       # Frontend React (Docker)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes API v1 
# Importés ici pour éviter les imports circulaires au démarrage
from api.v1 import auth, utilisateurs, equipements, metriques, alertes, rapports, websocket # noqa: E402

app.include_router(auth.router,         prefix="/api/v1/auth",         tags=["🔐 Authentification"])
app.include_router(utilisateurs.router, prefix="/api/v1/utilisateurs", tags=["👥 Utilisateurs"])
app.include_router(equipements.router,  prefix="/api/v1/equipements",  tags=["🖥️ Équipements"])
app.include_router(metriques.router,    prefix="/api/v1/metriques",    tags=["📊 Métriques"])
app.include_router(alertes.router,      prefix="/api/v1/alertes",      tags=["🚨 Alertes"])
app.include_router(rapports.router,     prefix="/api/v1/rapports",     tags=["📄 Rapports"])
app.include_router(websocket.router,    prefix="/ws",                  tags=["⚡ WebSocket"])


# Endpoints système 
@app.get("/health", tags=["⚙️ Système"], summary="Health check")
async def health_check():
    """Vérifie que l'API est opérationnelle — utilisé par Docker healthcheck."""
    return JSONResponse(
        content={
            "status": "ok",
            "version": settings.app_version,
            "environment": settings.environment,
        }
    )

@app.get("/", tags=["⚙️ Système"], summary="Racine API")
async def root():
    return JSONResponse(
        content={
            "message": "Plateforme de Supervision Réseau — API v1",
            "docs": "/api/docs",
            "health": "/health",
        }
    )
