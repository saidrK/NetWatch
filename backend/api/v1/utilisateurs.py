"""
— CRUD Utilisateurs + contrôle des rôles
GET    /utilisateurs       → liste (Admin uniquement)
POST   /utilisateurs       → créer (Admin uniquement)
GET    /utilisateurs/{id}  → détail (Admin ou soi-même)
PUT    /utilisateurs/{id}  → modifier (Admin uniquement)
DELETE /utilisateurs/{id}  → supprimer (Admin uniquement)
"""
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from database.postgresql import get_db
from models.utilisateur import Utilisateur, Admin, Technicien, RoleUtilisateur
from services.auth_service import (
    hasher_mot_de_passe, get_utilisateur_courant, verifier_role
)

router = APIRouter()
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# Schémas Pydantic
class UtilisateurCreate(BaseModel):
    nom:          str
    email:        EmailStr
    mot_de_passe: str
    role:         RoleUtilisateur


class UtilisateurUpdate(BaseModel):
    nom:          Optional[str]   = None
    email:        Optional[EmailStr] = None
    mot_de_passe: Optional[str]   = None
    actif:        Optional[bool]  = None


class UtilisateurResponse(BaseModel):
    id:                 int
    nom:                str
    email:              str
    role:               str
    actif:              bool
    derniere_connexion: Optional[datetime]
    created_at:         datetime

    class Config:
        from_attributes = True


# Dépendance — utilisateur courant authentifié
async def get_current_user(
    token: str = Depends(oauth2),
    db: AsyncSession = Depends(get_db),
) -> Utilisateur:
    utilisateur = await get_utilisateur_courant(db, token)
    if not utilisateur:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
        )
    return utilisateur


# Dépendance — Admin requis
async def admin_requis(
    current_user: Utilisateur = Depends(get_current_user),
) -> Utilisateur:
    if not verifier_role(current_user, RoleUtilisateur.ADMINISTRATEUR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs",
        )
    return current_user


# GET /utilisateurs — liste
@router.get(
    "/",
    response_model=list[UtilisateurResponse],
    summary="Liste des utilisateurs (Admin)",
)
async def lister_utilisateurs(
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(admin_requis),
):
    result = await db.execute(select(Utilisateur).order_by(Utilisateur.id))
    return result.scalars().all()


# POST /utilisateurs — créer
@router.post(
    "/",
    response_model=UtilisateurResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer un utilisateur (Admin)",
)
async def creer_utilisateur(
    body: UtilisateurCreate,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(admin_requis),
):
    # Vérifier unicité email
    result = await db.execute(select(Utilisateur).where(Utilisateur.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # Créer selon le rôle
    if body.role == RoleUtilisateur.ADMINISTRATEUR:
        user = Admin(
            nom=body.nom,
            email=body.email,
            mot_de_passe_hash=hasher_mot_de_passe(body.mot_de_passe),
            role=body.role,
        )
    else:
        user = Technicien(
            nom=body.nom,
            email=body.email,
            mot_de_passe_hash=hasher_mot_de_passe(body.mot_de_passe),
            role=body.role,
        )

    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


# GET /utilisateurs/{id} — détail
@router.get(
    "/{user_id}",
    response_model=UtilisateurResponse,
    summary="Détail d'un utilisateur",
)
async def get_utilisateur(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    # Admin ou soi-même
    if current_user.id != user_id and not verifier_role(current_user, RoleUtilisateur.ADMINISTRATEUR):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return user


# PUT /utilisateurs/{id} — modifier
@router.put(
    "/{user_id}",
    response_model=UtilisateurResponse,
    summary="Modifier un utilisateur (Admin)",
)
async def modifier_utilisateur(
    user_id: int,
    body: UtilisateurUpdate,
    db: AsyncSession = Depends(get_db),
    _: Utilisateur = Depends(admin_requis),
):
    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if body.nom:          user.nom = body.nom
    if body.email:        user.email = body.email
    if body.mot_de_passe: user.mot_de_passe_hash = hasher_mot_de_passe(body.mot_de_passe)
    if body.actif is not None: user.actif = body.actif

    await db.flush()
    await db.refresh(user)
    return user


# DELETE /utilisateurs/{id} — supprimer
@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer un utilisateur (Admin)",
)
async def supprimer_utilisateur(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Utilisateur = Depends(admin_requis),
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte")

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    await db.delete(user)