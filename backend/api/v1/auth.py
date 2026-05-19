"""
— Routes d'authentification
POST /login  → retourne token JWT
POST /logout → (stateless JWT — côté client)
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from database.postgresql import get_db
from services.auth_service import authentifier, creer_token

router = APIRouter()


# Schémas Pydantic
class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    nom:          str
    user_id:      int


class LoginRequest(BaseModel):
    email:        str
    mot_de_passe: str


# POST /login
@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Connexion utilisateur",
    description="Authentifie un utilisateur et retourne un token JWT. (BF01)"
)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    adresse_ip = request.client.host if request.client else "0.0.0.0"
    user_agent = request.headers.get("user-agent")

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
    )


# POST /logout
@router.post(
    "/logout",
    summary="Déconnexion",
    description="JWT est stateless — la déconnexion se fait côté client (supprimer le token)."
)
async def logout():
    """
    JWT est stateless : pas de blacklist serveur dans cette version.
    Le client doit supprimer le token de son stockage local.
    """
    return {"message": "Déconnexion réussie — supprimez le token côté client"}