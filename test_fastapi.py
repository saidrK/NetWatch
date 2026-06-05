from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

payload = {
    "nom": "Taha Moukhalid",
    "email": "taha@univh2c.ma",
    "mot_de_passe": "password123",
    "role": "TECHNICIEN"
}

resp = client.post("/api/v1/utilisateurs/", json=payload)
print("Status:", resp.status_code)
print("Body:", resp.text)
