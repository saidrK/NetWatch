"""
main.py — Point d'entrée de l'API FastAPI
"""
import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from database.postgresql import init_db, close_db, AsyncSessionLocal
from database.influxdb import get_influx
from api.v1.metriques import _pipeline_collecte

# Logging 
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()

async def background_collector():
    """Tâche en arrière-plan pour collecter les métriques Prometheus toutes les 15 secondes."""
    while True:
        try:
            async with AsyncSessionLocal() as db:
                influx = get_influx()
                # On utilise next() car get_influx() est un générateur FastAPI (yield)
                influx_service = next(influx) if hasattr(influx, "__next__") else influx
                await _pipeline_collecte(db, influx_service)
        except Exception as e:
            logger.error(f"❌ Erreur Background Collector: {e}")
        await asyncio.sleep(15)


# Lifespan (startup / shutdown) 
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialisation et nettoyage des ressources au démarrage/arrêt."""
    # Startup
    logger.info("🚀 Démarrage de la plateforme de supervision réseau...")
    await init_db()
    logger.info("✅ PostgreSQL initialisé")

    logger.info(f"🌍 Environnement : {settings.environment}")

    # Démarrer la collecte en arrière-plan
    collector_task = asyncio.create_task(background_collector())

    yield  # L'application tourne ici

    # Shutdown 
    collector_task.cancel()
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

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"❌ 422 Unprocessable Entity: {exc.errors()} (Body: {exc.body})")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",           # Frontend React (dev local)
        "http://localhost:5174",           # Frontend React (dev alt)
        "http://frontend:80",              # Frontend React (Docker)
        "http://192.168.1.103:5173",       # Frontend Fedora (IP fixe explicite)
        "http://192.168.1.103:5174",       # Frontend Fedora (IP fixe alt)
    ],
    # Couvre tout le sous-réseau 192.168.1.0/24 sur les ports Vite (5173/5174)
    # Utile si l'IP change via DHCP — à désactiver ou restreindre en production
    allow_origin_regex=r"http://192\.168\.1\.\d{1,3}:(5173|5174)",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Middleware logging des performances
@app.middleware("http")
async def log_performance(request: Request, call_next):
    """Log le temps de réponse de chaque requête pour monitoring."""
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    
    # Ne pas logger les health checks pour éviter le bruit
    if request.url.path not in ("/health", "/"):
        log_level = logging.WARNING if duration_ms > 2000 else logging.INFO
        logger.log(log_level, f"⏱️  {request.method} {request.url.path} → {response.status_code} [{duration_ms}ms]")
    
    response.headers["X-Response-Time"] = f"{duration_ms}ms"
    return response

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
@app.get("/health", tags=["⚙️ Système"], summary="Health check complet")
async def health_check():
    """
    Vérifie l'état complet de l'API et de ses dépendances.
    Retourne des informations sur la connectivité PostgreSQL et l'état général.
    """
    from database.postgresql import AsyncSessionLocal as async_session_factory
    
    db_status = "unknown"
    try:
        async with async_session_factory() as session:
            from sqlalchemy import text
            await session.execute(text("SELECT 1"))
            db_status = "ok"
    except Exception as e:
        db_status = f"error: {str(e)[:50]}"

    overall_status = "ok" if db_status == "ok" else "degraded"

    return JSONResponse(
        status_code=200 if overall_status == "ok" else 503,
        content={
            "status": overall_status,
            "version": settings.app_version,
            "environment": settings.environment,
            "services": {
                "postgresql": db_status,
                "api": "ok",
            },
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
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
