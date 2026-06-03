"""
services/auth_service.py — Service d'authentification + JWT Denylist
- hasher_mot_de_passe / verifier_mot_de_passe
- creer_token / verifier_token
- JWT Denylist thread-safe (asyncio.Lock sur un set en mémoire)
- authentifier / get_utilisateur_courant
"""

import asyncio
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import get_settings
from models.utilisateur import Utilisateur, RoleUtilisateur
from models.historique_connexion import HistoriqueConnexion, StatutConnexion

settings = get_settings()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── JWT Denylist (mémoire, thread-safe via asyncio.Lock) ──────────────────────
# Contient les JTI (jti claim) des tokens révoqués.
# En production avec plusieurs workers, remplacer par Redis.
_denylist: set[str] = set()
_denylist_lock = asyncio.Lock()


async def revoquer_token(jti: str) -> None:
    """Ajoute le JTI du token dans la denylist."""
    async with _denylist_lock:
        _denylist.add(jti)


async def est_token_revoque(jti: str) -> bool:
    """Retourne True si le token a été révoqué."""
    async with _denylist_lock:
        return jti in _denylist


# ── Mots de passe ─────────────────────────────────────────────────────────────
# bcrypt limite les mots de passe à 72 bytes.
# Les versions récentes de bcrypt lèvent ValueError si dépassé → on tronque
# explicitement pour garantir la cohérence entre hash et vérification.
_BCRYPT_MAX_BYTES = 72


def _tronquer_mdp(mot_de_passe: str) -> str:
    """Tronque le mot de passe à 72 bytes (limite bcrypt)."""
    encoded = mot_de_passe.encode("utf-8")
    return encoded[:_BCRYPT_MAX_BYTES].decode("utf-8", errors="ignore")


def hasher_mot_de_passe(mot_de_passe: str) -> str:
    return pwd_context.hash(_tronquer_mdp(mot_de_passe))


def verifier_mot_de_passe(mot_de_passe: str, hash: str) -> bool:
    return pwd_context.verify(_tronquer_mdp(mot_de_passe), hash)


# ── JWT ───────────────────────────────────────────────────────────────────────

def creer_token(data: dict, expire_heures: Optional[int] = None) -> str:
    """
    Crée un token JWT signé.
    Inclut un claim 'jti' unique (UUID) pour permettre la révocation.
    """
    import uuid
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(
        hours=expire_heures or settings.jwt_expire_hours
    )
    payload.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),
    })
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verifier_token(token: str) -> Optional[dict]:
    """
    Décode et valide un token JWT.
    Ne vérifie PAS la denylist ici — cela se fait dans get_utilisateur_courant
    car cette fonction est synchrone (appelée aussi hors contexte async).
    """
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return None


# ── Authentification ──────────────────────────────────────────────────────────

async def authentifier(
    db: AsyncSession,
    email: str,
    mot_de_passe: str,
    adresse_ip: str = "0.0.0.0",
    user_agent: str = None,
) -> Optional[Utilisateur]:
    result = await db.execute(
        select(Utilisateur).where(Utilisateur.email == email)
    )
    utilisateur = result.scalar_one_or_none()

    if not utilisateur or not verifier_mot_de_passe(mot_de_passe, utilisateur.mot_de_passe_hash):
        if utilisateur:
            await _enregistrer_connexion(db, utilisateur.id, StatutConnexion.ECHEC, adresse_ip, user_agent)
        return None

    if not utilisateur.actif:
        return None

    utilisateur.derniere_connexion = datetime.utcnow()
    await _enregistrer_connexion(db, utilisateur.id, StatutConnexion.SUCCES, adresse_ip, user_agent)
    return utilisateur


async def _enregistrer_connexion(
    db: AsyncSession,
    utilisateur_id: int,
    statut: StatutConnexion,
    adresse_ip: str,
    user_agent: str = None,
):
    historique = HistoriqueConnexion(
        utilisateur_id=utilisateur_id,
        statut=statut,
        adresse_ip=adresse_ip,
        date_connexion=datetime.utcnow(),
    )
    db.add(historique)
    await db.flush()


async def get_utilisateur_courant(
    db: AsyncSession,
    token: str,
) -> Optional[Utilisateur]:
    """
    Décode le token JWT, vérifie la denylist via jti, puis retourne l'utilisateur.
    Retourne None si le token est invalide, expiré ou révoqué.
    """
    payload = verifier_token(token)
    if not payload:
        return None

    jti = payload.get("jti")
    if jti and await est_token_revoque(jti):
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(
        select(Utilisateur).where(Utilisateur.id == int(user_id))
    )
    return result.scalar_one_or_none()


def verifier_role(utilisateur: Utilisateur, role_requis: RoleUtilisateur) -> bool:
    return utilisateur.role == role_requis