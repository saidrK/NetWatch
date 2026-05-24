# Service d'authentification

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

# Contexte bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# Utilitaires mots de passe
def hasher_mot_de_passe(mot_de_passe: str) -> str:
    """Retourne le hash bcrypt du mot de passe."""
    return pwd_context.hash(mot_de_passe)


def verifier_mot_de_passe(mot_de_passe: str, hash: str) -> bool:
    """Vérifie un mot de passe en clair contre son hash bcrypt."""
    return pwd_context.verify(mot_de_passe, hash)


# JWT 
def creer_token(data: dict, expire_heures: Optional[int] = None) -> str:
    """
    Crée un token JWT signé avec les données fournies.
    Expire dans jwt_expire_hours heures (depuis .env).
    """
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(
        hours=expire_heures or settings.jwt_expire_hours
    )
    payload.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verifier_token(token: str) -> Optional[dict]:
    """
    Vérifie et décode un token JWT.
    Retourne le payload si valide, None sinon.
    """
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return None


# Authentification utilisateur 
async def authentifier(
    db: AsyncSession,
    email: str,
    mot_de_passe: str,
    adresse_ip: str = "0.0.0.0",
    user_agent: str = None,
) -> Optional[Utilisateur]:
    """
    Vérifie les credentials et enregistre l'historique de connexion.
    Retourne l'utilisateur si OK, None si échec.
    """
    # Chercher l'utilisateur par email
    result = await db.execute(
        select(Utilisateur).where(Utilisateur.email == email)
    )
    utilisateur = result.scalar_one_or_none()

    # Vérification mot de passe
    if not utilisateur or not verifier_mot_de_passe(mot_de_passe, utilisateur.mot_de_passe_hash):
        # Enregistrer l'échec
        if utilisateur:
            await _enregistrer_connexion(db, utilisateur.id, StatutConnexion.ECHEC, adresse_ip, user_agent)
        return None

    if not utilisateur.actif:
        return None

    # Mettre à jour derniere_connexion
    utilisateur.derniere_connexion = datetime.utcnow()

    # Enregistrer le succès
    await _enregistrer_connexion(db, utilisateur.id, StatutConnexion.SUCCES, adresse_ip, user_agent)

    return utilisateur


async def _enregistrer_connexion(
    db: AsyncSession,
    utilisateur_id: int,
    statut: StatutConnexion,
    adresse_ip: str,
    user_agent: str = None,
):
    """Enregistre une tentative de connexion dans l'historique (BF01)."""
    historique = HistoriqueConnexion(
        utilisateur_id=utilisateur_id,
        statut=statut,
        adresse_ip=adresse_ip,

        date_connexion=datetime.utcnow(),
    )
    db.add(historique)
    await db.flush()


# Récupérer utilisateur courant depuis token
async def get_utilisateur_courant(
    db: AsyncSession,
    token: str,
) -> Optional[Utilisateur]:
    """
    Decode le token JWT et retourne l'utilisateur correspondant.
    Utilisé comme dépendance FastAPI dans les routes protégées.
    """
    payload = verifier_token(token)
    if not payload:
        return None

    user_id = payload.get("sub")
    if not user_id:
        return None

    result = await db.execute(
        select(Utilisateur).where(Utilisateur.id == int(user_id))
    )
    return result.scalar_one_or_none()


# Vérification des rôles
def verifier_role(utilisateur: Utilisateur, role_requis: RoleUtilisateur) -> bool:
    """Vérifie que l'utilisateur possède le rôle requis."""
    return utilisateur.role == role_requis