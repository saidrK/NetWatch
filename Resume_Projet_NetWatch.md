# Résumé du projet NetWatch

**NetWatch** est une plateforme web de supervision réseau intelligente réalisée dans le cadre d’un Projet de Fin d’Études à la Faculté des Sciences Ben M’sik, Université Hassan II de Casablanca.

Le projet a pour objectif de centraliser la surveillance d’un parc d’équipements réseau dans une interface unique de type **Mission Control**, avec une vue en temps réel de l’état du réseau, des métriques système, des alertes et des rapports d’activité.

## Objectifs principaux
- Surveiller les équipements et les métriques réseau en temps réel.
- Détecter automatiquement les anomalies grâce à l’intelligence artificielle.
- Découvrir les équipements du réseau via des scans Nmap.
- Envoyer des alertes multicanal par Telegram, email SMTP et webhook.
- Générer des rapports d’exploitation en PDF, Excel et CSV.
- Intégrer une supervision externe via Zabbix.

## Architecture générale
Le projet repose sur une architecture **full-stack** avec :
- un **backend FastAPI** pour l’API, la logique métier, l’authentification JWT et le WebSocket temps réel ;
- un **frontend React + Vite** pour le tableau de bord et l’administration ;
- **PostgreSQL** pour les données métier ;
- **InfluxDB** et **Prometheus** pour les métriques ;
- **Docker Compose** pour le déploiement des services.

## Fonctionnalités marquantes
- Tableau de bord dynamique avec indicateurs de performance.
- Collecte et affichage temps réel des métriques CPU, RAM, bande passante et latence.
- Détection d’anomalies par **Isolation Forest**.
- Gestion de l’inventaire des équipements et des ports ouverts.
- Système d’alertes avec acquittement et déduplication.
- Génération automatique de rapports d’activité.
- Gestion des utilisateurs avec rôles **Administrateur** et **Technicien**.

## Technologies utilisées
- **Backend** : FastAPI, SQLAlchemy, Pydantic, scikit-learn, python-nmap, ReportLab, openpyxl.
- **Frontend** : React, Vite, Recharts, Axios, React Router, Tailwind CSS.
- **Infra** : Docker, Nginx, PostgreSQL, InfluxDB, Prometheus, Zabbix.

## Valeur du projet
NetWatch fournit une solution moderne de supervision réseau, orientée temps réel, avec une forte automatisation des alertes et une aide à la détection proactive des incidents. Le projet combine supervision, visualisation, intelligence artificielle et génération de rapports dans une seule plateforme cohérente.

**Projet académique 2025–2026**
