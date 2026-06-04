"""
api/v1/auth.py — Routes d'authentification
POST /login          → JWT + rate limiting
GET  /me             → utilisateur courant
POST /logout         → révocation token (denylist)
POST /change-password→ workflow complet : vérif ancien MDP + complexité + révocation JWT
"""
import re
import time
import logging
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator

from database.postgresql import get_db
from models.utilisateur import Utilisateur
from services.auth_service import (
    authentifier,
    creer_token,
    get_utilisateur_courant,
    hasher_mot_de_passe,
    verifier_mot_de_passe,
    revoquer_token,
    verifier_token,
)

router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
logger = logging.getLogger(__name__)

# ── Rate Limiting login ───────────────────────────────────────────────────────
_login_attempts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_ATTEMPTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60


def _check_rate_limit(ip: str):
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS
    _login_attempts[ip] = [t for t in _login_attempts[ip] if t > window_start]
    if len(_login_attempts[ip]) >= RATE_LIMIT_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Trop de tentatives de connexion. Réessayez dans {RATE_LIMIT_WINDOW_SECONDS} secondes.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
        )
    _login_attempts[ip].append(now)


# ── Dépendance utilisateur courant ────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2),
    db: AsyncSession = Depends(get_db),
) -> Utilisateur:
    utilisateur = await get_utilisateur_courant(db, token)
    if not utilisateur:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return utilisateur


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    nom:          str
    user_id:      int
    email:        str


class LoginRequest(BaseModel):
    email:        str
    mot_de_passe: str


class MeResponse(BaseModel):
    user_id: int
    nom:     str
    role:    str
    email:   str


class ChangePasswordRequest(BaseModel):
    ancien_mot_de_passe: str
    nouveau_mot_de_passe: str

    @field_validator("nouveau_mot_de_passe")
    @classmethod
    def valider_complexite(cls, v: str) -> str:
        """
        Règles de complexité :
          - Minimum 8 caractères
          - Au moins 1 majuscule
          - Au moins 1 chiffre
          - Au moins 1 caractère spécial (!@#$%^&*...)
        """
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
        if not re.search(r"\d", v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\\;'/`~]", v):
            raise ValueError("Le mot de passe doit contenir au moins un caractère spécial.")
        return v


class LogoutRequest(BaseModel):
    pass


# ── POST /login ───────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Connexion utilisateur",
)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    adresse_ip = request.client.host if request.client else "0.0.0.0"
    user_agent = request.headers.get("user-agent")

    _check_rate_limit(adresse_ip)

    utilisateur = await authentifier(
        db=db,
        email=body.email,
        mot_de_passe=body.mot_de_passe,
        adresse_ip=adresse_ip,
        user_agent=user_agent,
    )

    if not utilisateur:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = creer_token({"sub": str(utilisateur.id), "role": utilisateur.role.value})

    return TokenResponse(
        access_token=token,
        role=utilisateur.role.value,
        nom=utilisateur.nom,
        user_id=utilisateur.id,
        email=utilisateur.email,
    )


# ── GET /me ───────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=MeResponse,
    summary="Utilisateur courant",
)
async def me(current_user: Utilisateur = Depends(get_current_user)):
    return MeResponse(
        user_id=current_user.id,
        nom=current_user.nom,
        role=current_user.role.value,
        email=current_user.email,
    )


# ── POST /logout ──────────────────────────────────────────────────────────────

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Déconnexion — révocation du token JWT",
)
async def logout(
    token: str = Depends(oauth2),
):
    """
    Révoque le token JWT courant via sa claim 'jti'.
    Le token est ajouté à la denylist en mémoire (asyncio-safe).
    """
    payload = verifier_token(token)
    if payload:
        jti = payload.get("jti")
        if jti:
            await revoquer_token(jti)
            logger.info(f"🔒 Token révoqué — jti={jti}")

    return {"message": "Déconnexion réussie — token révoqué côté serveur"}


# ── POST /change-password ─────────────────────────────────────────────────────

@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Changement de mot de passe sécurisé",
    description=(
        "Vérifie l'ancien mot de passe, valide la complexité du nouveau, "
        "met à jour le hash bcrypt, puis révoque le token JWT actif pour "
        "forcer une reconnexion immédiate."
    ),
)
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    token: str = Depends(oauth2),
    current_user: Utilisateur = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Vérifier l'ancien mot de passe
    if not verifier_mot_de_passe(body.ancien_mot_de_passe, current_user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ancien mot de passe incorrect.",
        )

    # 2. Vérifier que le nouveau != ancien (inutile de rehacher le même)
    if verifier_mot_de_passe(body.nouveau_mot_de_passe, current_user.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l'ancien.",
        )

    # 3. Mettre à jour le hash en base
    result = await db.execute(
        select(Utilisateur).where(Utilisateur.id == current_user.id)
    )
    utilisateur_db = result.scalar_one_or_none()
    if not utilisateur_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")

    utilisateur_db.mot_de_passe_hash = hasher_mot_de_passe(body.nouveau_mot_de_passe)
    await db.flush()

    # 4. Révoquer le token JWT actif → force reconnexion
    payload = verifier_token(token)
    if payload:
        jti = payload.get("jti")
        if jti:
            await revoquer_token(jti)
            logger.info(f"🔒 Token révoqué après changement MDP — user={current_user.id} jti={jti}")

    return {
        "message": "Mot de passe modifié avec succès. Reconnectez-vous avec votre nouveau mot de passe.",
        "action_requise": "RECONNEXION",
    }