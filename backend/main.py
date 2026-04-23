from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import devices, metrics, alerts, users, auth, websocket


app = FastAPI(title="Supervision Réseau API", version="1.0.0")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Base de données ───────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(devices.router)
app.include_router(metrics.router)
app.include_router(alerts.router)
app.include_router(users.router)
app.include_router(websocket.router)

# ── Santé de l'API ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "API running", "version": "1.0.0"}
