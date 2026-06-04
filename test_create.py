import asyncio
import json
import httpx
from datetime import datetime, timedelta
from jose import jwt
from config import get_settings

settings = get_settings()

def create_admin_token():
    expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode = {"sub": "admin@test.com", "role": "ADMINISTRATEUR", "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)

async def run():
    token = create_admin_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "nom": "Taha Moukhalid",
        "email": "taha@univh2c.ma",
        "mot_de_passe": "password123",
        "role": "TECHNICIEN"
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/api/v1/utilisateurs/", json=payload, headers=headers)
        print("Response Code:", resp.status_code)
        print("Response Body:", resp.text)

asyncio.run(run())
