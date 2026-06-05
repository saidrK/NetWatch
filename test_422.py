import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from database.postgresql import AsyncSessionLocal
from services.auth_service import creer_token
from models.utilisateur import Utilisateur
from sqlalchemy import select
import httpx

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Utilisateur).where(Utilisateur.email == "admin@netwatch.local"))
        admin = result.scalar_one_or_none()
        if not admin:
            print("Admin not found")
            return
        token = creer_token({"sub": admin.email, "role": admin.role.value})
    
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "nom": "Taha Moukhalid",
        "email": "taha@univh2c.ma",
        "mot_de_passe": "password123",
        "role": "TECHNICIEN"
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/api/v1/utilisateurs/", json=payload, headers=headers)
        print("Status:", resp.status_code)
        print("Body:", resp.text)

asyncio.run(main())
