# ── Image de base ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

# ── Répertoire de travail ─────────────────────────────────────────────────────
WORKDIR /app

# ── Dépendances système minimales ─────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ── Installation des dépendances Python ───────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copie du code source ───────────────────────────────────────────────────────
COPY . .

# ── Port exposé ───────────────────────────────────────────────────────────────
EXPOSE 8000

# ── Démarrage de l'application ────────────────────────────────────────────────
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
