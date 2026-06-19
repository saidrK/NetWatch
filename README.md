# 🛡️ NetWatch — Plateforme Intelligente de Supervision Réseau

> **Projet de Fin d'Études — Licence Réseaux & Systèmes / Développement**  
> Faculté des Sciences Ben M'sik — Université Hassan II, Casablanca  
> Année universitaire 2025–2026

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20+%20Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![InfluxDB](https://img.shields.io/badge/Métriques-InfluxDB-22ADF6?style=flat-square&logo=influxdb)](https://influxdata.com)
[![Docker](https://img.shields.io/badge/Infra-Docker%20Compose-2496ED?style=flat-square&logo=docker)](https://docs.docker.com/compose)

---

## 📋 Table des matières

1. [Présentation](#-présentation)
2. [Équipe](#-équipe)
3. [Architecture](#-architecture)
4. [Fonctionnalités](#-fonctionnalités)
5. [Stack technique](#-stack-technique)
6. [Structure du projet](#-structure-du-projet)
7. [Démarrage rapide](#-démarrage-rapide)
8. [Variables d'environnement](#-variables-denvironnement)
9. [API — Routes disponibles](#-api--routes-disponibles)
10. [Tests](#-tests)
11. [Documentation](#-documentation)

---

## 🎯 Présentation

**NetWatch** est une plateforme web full-stack de supervision réseau intelligente développée dans le cadre d'un Projet de Fin d'Études. Elle offre une interface "Mission Control" permettant de superviser en temps réel l'état d'un parc d'équipements réseau, de détecter des anomalies par intelligence artificielle (Isolation Forest), de générer des rapports multi-format et d'envoyer des notifications automatiques sur plusieurs canaux.

### Objectifs principaux
- **Supervision temps réel** : collecte Prometheus + push WebSocket toutes les 5 secondes
- **Détection d'anomalies IA** : algorithme Isolation Forest pour identifier les comportements anormaux (CPU, RAM, bande passante)
- **Inventaire réseau** : découverte automatique des équipements via Nmap
- **Alerting multicanal** : notifications Telegram, Email SMTP et Webhook avec déduplication
- **Rapports automatiques** : génération PDF (ReportLab), Excel (openpyxl) et CSV
- **Supervision externe** : intégration Zabbix via API JSON-RPC

---

## 👥 Équipe

| Membre | Rôle | Responsabilité principale |
|--------|------|--------------------------|
| **Said Roukissy** | Scrum Master / Réseaux & Systèmes | Infrastructure, IA, Docker, Backend |
| **Taha Moukhalid** | Développeur Full-Stack | FastAPI, React.js, Notifications |

*Encadrante :* **Pr. Ichrak Benamri** — Faculté des Sciences Ben M'sik

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        COUCHE PRÉSENTATION                       │
│  React.js + Vite │ Dashboard Mission Control │ Recharts │ Nginx  │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API + WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│                        COUCHE TRAITEMENT                         │
│       FastAPI (Python) │ Isolation Forest IA │ Notifications      │
│       JWT Auth │ RBAC │ BackgroundTasks │ Zabbix JSON-RPC        │
└────────────┬──────────────────────────┬───────────────────────-─┘
             │                          │
┌────────────▼────────────┐  ┌──────────▼──────────────────────────┐
│   COUCHE STOCKAGE       │  │      COUCHE COLLECTE                 │
│  PostgreSQL (métier)    │  │  Prometheus │ Node Exporter │ Nmap   │
│  InfluxDB (métriques)   │  │  Zabbix Server + Web               │
└─────────────────────────┘  └─────────────────────────────────────┘
```

### Services Docker Compose (9 services)
| Service | Image | Port | Rôle |
|---------|-------|------|------|
| `postgres` | postgres:15-alpine | 5433 | Base de données principale |
| `influxdb` | influxdb:2.7-alpine | 8086 | Stockage métriques temporelles |
| `prometheus` | prom/prometheus:v2.51.0 | 9090 | Collecte métriques |
| `node_exporter` | prom/node-exporter:v1.7.0 | 9100 | Métriques hôte (CPU/RAM/réseau) |
| `zabbix_server` | zabbix-server-pgsql:6.4 | 10051 | Supervision SNMP avancée |
| `zabbix_web` | zabbix-web-nginx-pgsql:6.4 | 8081 | Interface Zabbix + API JSON-RPC |
| `backend` | (build local) | 8000 | API FastAPI |
| `frontend` | (build local) | 80/443 | Interface React + Nginx HTTPS |

---

## ✨ Fonctionnalités

### 🖥️ Dashboard Mission Control
- **4 KPI cards** : CPU moyen, RAM moyenne, nœuds actifs, alertes actives
- **3 jauges radiales** : CPU, RAM, disponibilité réseau (RadialBarChart)
- **Graphiques temps réel** : évolution CPU/RAM (AreaChart, 40 points max)
- **Bande passante** : débit entrant/sortant en Mbps (AreaChart dual)
- **Latence & perte de paquets** : LineChart dual-axis
- **Score IA** : courbe Isolation Forest en temps réel
- **Tableau des nœuds** : inventaire live avec statut UP/DOWN
- **Panneau Zabbix** : résumé hosts et problèmes externes
- **Indicateur WebSocket** : état de connexion et dernière mise à jour

### 📡 Supervision réseau
- Découverte automatique des équipements par **scan Nmap** (subnet configurable)
- Affichage des **ports ouverts** avec protocole, service et version
- Statuts `EN_LIGNE` / `HORS_LIGNE` / `INCONNU`
- **Soft delete** : les équipements supprimés ne disparaissent pas des archives

### 🤖 Intelligence Artificielle
- Algorithme **Isolation Forest** (scikit-learn) pour détection d'anomalies
- Analyse multi-métriques : CPU, RAM, bande passante
- Scores d'anomalie temps réel poussés via WebSocket
- **Simulateur fallback** : données réalistes si Prometheus ne répond pas (5% d'anomalies simulées)

### 🚨 Alertes & Notifications
- Niveaux : `INFO` / `WARNING` / `CRITIQUE`
- **Telegram** : messages async avec timeout
- **Email SMTP** : via `aiosmtplib`
- **Webhook** : HTTP POST configurable
- **Déduplication** : cache mémoire 30 min pour éviter le spam
- Acquittement des alertes via l'API et l'interface

### 📄 Rapports
- Génération **PDF** riche (ReportLab) : page de couverture, KPI, inventaire, 50 dernières alertes
- Génération **Excel** (openpyxl) : 3 feuilles colorées (Résumé, Alertes, Équipements)
- Génération **CSV** (UTF-8-sig, séparateur `;`) : compatible Excel FR
- Génération asynchrone en `BackgroundTask` (non bloquant)
- Téléchargement direct avec MIME correct

### 🔐 Authentification & RBAC
- Authentification **JWT** avec révocation côté serveur (denylist mémoire)
- Deux rôles : **Administrateur** (accès complet) / **Technicien** (lecture + acquittement)
- Changement de mot de passe sécurisé (bcrypt)
- Session persistante via `localStorage` sans flash d'écran au rechargement

---

## 🛠️ Stack technique

### Backend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Python | 3.11+ | Langage principal |
| FastAPI | 0.100+ | Framework API REST + WebSocket |
| SQLAlchemy | 2.x | ORM async PostgreSQL |
| Pydantic | 2.x | Validation des données |
| influxdb-client | 1.x | Client InfluxDB async |
| scikit-learn | 1.x | Isolation Forest IA |
| python-jose | 3.x | JWT |
| bcrypt | 4.x | Hachage mots de passe |
| httpx | 0.x | Client HTTP async (Prometheus) |
| python-nmap | 0.x | Scanner réseau |
| reportlab | 3.x | Génération PDF |
| openpyxl | 3.x | Génération Excel |
| aiosmtplib | 2.x | Email SMTP async |

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 18+ | Framework UI |
| Vite | 5+ | Bundler + dev server |
| Recharts | 2.x | Graphiques (AreaChart, LineChart, RadialBarChart) |
| Lucide React | — | Icônes |
| Axios | 1.x | Client HTTP |
| React Router | 6+ | Navigation SPA |
| Tailwind CSS | 3.x | Styles utilitaires |

---

## 📁 Structure du projet

```
supervision-reseau-pfe/
├── backend/
│   ├── api/v1/
│   │   ├── auth.py          # Authentification JWT
│   │   ├── utilisateurs.py  # CRUD utilisateurs + RBAC
│   │   ├── equipements.py   # Inventaire + scan Nmap
│   │   ├── metriques.py     # Métriques Prometheus → InfluxDB
│   │   ├── alertes.py       # Alertes IA
│   │   ├── rapports.py      # Génération PDF/Excel/CSV
│   │   ├── websocket.py     # Dashboard temps réel
│   │   └── zabbix.py        # Supervision externe
│   ├── database/
│   │   ├── postgresql.py    # Sessions async + ORM
│   │   └── influxdb.py      # Séries temporelles
│   ├── models/              # Modèles SQLAlchemy
│   ├── services/
│   │   ├── auth_service.py        # JWT + bcrypt
│   │   ├── ia_service.py          # Isolation Forest
│   │   ├── notification_service.py # Telegram/SMTP/Webhook
│   │   ├── scan_service.py        # Nmap
│   │   └── zabbix_service.py      # Client JSON-RPC
│   ├── tests/               # Suite pytest (7 suites)
│   ├── main.py              # Point d'entrée FastAPI
│   ├── config.py            # Configuration centralisée
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/   # 10 composants Mission Control
│   │   │   ├── Inventaire/  # ListeEquipements, DetailEquipement
│   │   │   ├── Alertes/     # ListeAlertes
│   │   │   ├── Rapports/    # GenererRapport, ListeRapports
│   │   │   ├── Utilisateurs/# GestionUtilisateurs
│   │   │   └── Profil/      # ChangePassword
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # État global JWT
│   │   ├── hooks/
│   │   │   ├── useAuth.js       # Hook authentification
│   │   │   └── useWebSocket.js  # Hook WebSocket
│   │   ├── pages/           # Pages principales
│   │   ├── services/
│   │   │   └── api.js       # Client Axios centralisé
│   │   └── index.css        # Thème cyberpunk
│   ├── nginx.conf           # Nginx HTTPS + proxy
│   └── Dockerfile
├── config/
│   └── prometheus.yml       # Configuration Prometheus
├── docker-compose.yml       # Stack complète (9 services)
├── .env.example             # Exemple variables d'environnement
└── README.md
```

---

## 🚀 Démarrage rapide

### Prérequis
- Docker Desktop / Docker Engine + Docker Compose v2
- Git

### 1. Cloner le dépôt
```bash
git clone https://github.com/votre-org/supervision-reseau-pfe.git
cd supervision-reseau-pfe
```

### 2. Configurer les variables d'environnement
```bash
# Copier le fichier exemple
cp .env.example .env
cp backend/.env.example backend/.env

# Éditer les secrets nécessaires
nano .env
```

Variables à renseigner obligatoirement :
```env
INFLUXDB_TOKEN=votre_token_influxdb
```

Et dans `backend/.env` :
```env
SECRET_KEY=votre_cle_secrete_jwt_longue
TELEGRAM_BOT_TOKEN=votre_token_bot       # optionnel
TELEGRAM_CHAT_ID=votre_chat_id           # optionnel
SMTP_HOST=smtp.gmail.com                 # optionnel
SMTP_USER=votre@email.com                # optionnel
SMTP_PASSWORD=votre_mot_de_passe         # optionnel
```

### 3. Démarrer la stack
```bash
docker compose up -d
```

### 4. Vérifier que tout fonctionne
```bash
# Santé de l'API backend
curl http://localhost:8000/health

# Accès à la documentation Swagger
open http://localhost:8000/api/docs

# Interface frontend
open http://localhost:80
```

### 5. Connexion initiale
```
URL       : http://localhost
Email     : admin@netwatch.local
Mot de passe : admin123
```

> ⚠️ Changez le mot de passe administrateur dès la première connexion.

### Développement local (sans Docker)

**Backend :**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend :**
```bash
cd frontend
npm install
npm run dev     # Démarre sur http://localhost:5173
```

---

## ⚙️ Variables d'environnement

### `backend/.env`
| Variable | Description | Défaut |
|----------|-------------|--------|
| `DATABASE_URL` | URL PostgreSQL async | `postgresql+asyncpg://...` |
| `SECRET_KEY` | Clé JWT (≥32 caractères) | — |
| `ALGORITHM` | Algorithme JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée du token (min) | `480` |
| `INFLUXDB_URL` | URL InfluxDB | `http://influxdb:8086` |
| `INFLUXDB_TOKEN` | Token InfluxDB | — |
| `INFLUXDB_ORG` | Organisation InfluxDB | `supervision` |
| `INFLUXDB_BUCKET` | Bucket InfluxDB | `metriques` |
| `PROMETHEUS_URL` | URL Prometheus | `http://prometheus:9090` |
| `ZABBIX_URL` | URL API Zabbix | `http://zabbix_web:8080` |
| `ZABBIX_USER` | Utilisateur Zabbix | `Admin` |
| `ZABBIX_PASSWORD` | Mot de passe Zabbix | — |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram | optionnel |
| `TELEGRAM_CHAT_ID` | Chat ID Telegram | optionnel |
| `SMTP_HOST` | Serveur SMTP | optionnel |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_USER` | Utilisateur SMTP | optionnel |
| `SMTP_PASSWORD` | Mot de passe SMTP | optionnel |
| `ENVIRONMENT` | Environnement (`dev`/`prod`) | `development` |

---

## 📡 API — Routes disponibles

### 🔐 Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/v1/auth/login` | Connexion — retourne JWT |
| `GET` | `/api/v1/auth/me` | Profil utilisateur courant |
| `POST` | `/api/v1/auth/logout` | Déconnexion (révocation token) |
| `POST` | `/api/v1/auth/change-password` | Changement de mot de passe |

### 👥 Utilisateurs *(Admin requis)*
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/utilisateurs/` | Liste des utilisateurs |
| `POST` | `/api/v1/utilisateurs/` | Créer un utilisateur |
| `GET` | `/api/v1/utilisateurs/{id}` | Détail utilisateur |
| `PUT` | `/api/v1/utilisateurs/{id}` | Modifier un utilisateur |
| `DELETE` | `/api/v1/utilisateurs/{id}` | Supprimer un utilisateur |

### 🖥️ Équipements
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/equipements/` | Inventaire des équipements |
| `GET` | `/api/v1/equipements/{id}` | Détail + ports Nmap |
| `POST` | `/api/v1/equipements/scan` | Lancer un scan Nmap *(Admin)* |
| `DELETE` | `/api/v1/equipements/{id}` | Soft delete *(Admin)* |

### 📊 Métriques
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/metriques/{id}` | Dernière métrique + niveau IA |
| `GET` | `/api/v1/metriques/{id}/historique` | Historique (param `heures=24`) |
| `POST` | `/api/v1/metriques/collecter` | Collecte manuelle Prometheus |

### 🚨 Alertes
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/alertes/` | Liste filtrable |
| `GET` | `/api/v1/alertes/{id}` | Détail d'une alerte |
| `PUT` | `/api/v1/alertes/{id}/acquitter` | Acquitter une alerte |

### 📄 Rapports
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/rapports/` | Liste des rapports générés |
| `POST` | `/api/v1/rapports/generer` | Générer un rapport (PDF/Excel/CSV) |
| `GET` | `/api/v1/rapports/{id}/telecharger` | Télécharger un rapport |

### 📡 Zabbix
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/v1/zabbix/hosts` | Hosts Zabbix |
| `GET` | `/api/v1/zabbix/problems` | Problèmes Zabbix |
| `GET` | `/api/v1/zabbix/resume` | Résumé Zabbix |

### ⚡ Temps réel
| Type | Route | Description |
|------|-------|-------------|
| `WebSocket` | `/ws/dashboard` | Push métriques + alertes toutes les 5s |
| `GET` | `/health` | Health check API + PostgreSQL |

> 📚 Documentation interactive complète : [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## 🧪 Tests

### Lancer les tests
```bash
cd backend
pytest tests/ -v
```

### Suites disponibles
| Fichier | Description |
|---------|-------------|
| `tests/test_auth.py` | Authentification JWT |
| `tests/test_alertes.py` | CRUD alertes + acquittement |
| `tests/test_equipement.py` | Inventaire + RBAC |
| `tests/test_metriques.py` | Pipeline métriques |
| `tests/test_notifications.py` | Déduplication + canaux |
| `tests/test_websocket.py` | WebSocket dashboard |
| `tests/test_health.py` | Health check |

> **Note** : Les tests d'intégration nécessitent une instance PostgreSQL active. Pour exécuter sans la stack Docker, configurer un PostgreSQL de test dans `tests/conftest.py`.

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [`README.md`](README.md) | Ce fichier — présentation générale |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Identité visuelle et charte graphique |
| [`docs/SCENARIO_DEMONSTRATION.md`](docs/SCENARIO_DEMONSTRATION.md) | Scénario de démonstration pour la soutenance |
| `AUDIT_PFE_NETWATCH.md` | Rapports d'audit techniques (Tournée 10) |
| [API Swagger](http://localhost:8000/api/docs) | Documentation interactive de l'API |
| [API ReDoc](http://localhost:8000/api/redoc) | Documentation alternative ReDoc |

---

## 📜 Licence

Projet académique — Faculté des Sciences Ben M'sik, Université Hassan II de Casablanca.  
Tous droits réservés © 2025–2026 Said Roukissy & Taha Moukhalid.

---

*NetWatch Platform v1.0 — PFE 2025/2026 — FSBM Hassan II, Casablanca*
