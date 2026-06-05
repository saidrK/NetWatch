from fastapi.testclient import TestClient
from backend.main import app
from backend.api.v1.utilisateurs import get_current_user, admin_requis
from backend.models.utilisateur import Administrateur, RoleUtilisateur

# Mock admin user
admin_user = Administrateur(id=1, nom="Admin", email="admin@netwatch.local", role=RoleUtilisateur.ADMINISTRATEUR)

app.dependency_overrides[get_current_user] = lambda: admin_user
app.dependency_overrides[admin_requis] = lambda: admin_user

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
