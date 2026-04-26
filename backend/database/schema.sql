-- ============================================================
-- SCHEMA PostgreSQL — Plateforme de Supervision Réseau
-- ============================================================

-- Nettoyage si re-exécution
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS rapport CASCADE;
DROP TABLE IF EXISTS alerte CASCADE;
DROP TABLE IF EXISTS port CASCADE;
DROP TABLE IF EXISTS equipement CASCADE;
DROP TABLE IF EXISTS historique_connexion CASCADE;
DROP TABLE IF EXISTS technicien CASCADE;
DROP TABLE IF EXISTS administrateur CASCADE;
DROP TABLE IF EXISTS utilisateur CASCADE;

-- Types ENUM
DROP TYPE IF EXISTS role_enum CASCADE;
DROP TYPE IF EXISTS statut_enum CASCADE;
DROP TYPE IF EXISTS niveau_alerte_enum CASCADE;
DROP TYPE IF EXISTS canal_enum CASCADE; 
DROP TYPE IF EXISTS type_equipement_enum;
DROP TYPE IF EXISTS format_rapport_enum;
DROP TYPE IF EXISTS statut_connexion_enum;

CREATE TYPE role_enum AS ENUM (
    'ADMINISTRATEUR',
    'TECHNICIEN'
);

CREATE TYPE statut_enum AS ENUM (
    'EN_LIGNE',
    'HORS_LIGNE',
    'INCONNU'
);

CREATE TYPE niveau_alerte_enum AS ENUM (
    'NORMAL',
    'WARNING',
    'CRITIQUE'
);

CREATE TYPE canal_enum AS ENUM (
    'TELEGRAM',
    'EMAIL'
);

CREATE TYPE type_equipement_enum AS ENUM (
    'SERVEUR', 'ROUTEUR', 'SWITCH', 'PC', 'INCONNU'
);

CREATE TYPE format_rapport_enum AS ENUM (
    'PDF', 'EXCEL', 'CSV'
);

CREATE TYPE statut_connexion_enum AS ENUM ( 'SUCCES', 'ECHEC');

CREATE TYPE type_generation_enum AS ENUM ( 'AUTOMATIQUE', 'MANUEL');

-- ============================================================
-- TABLE : utilisateur (classe abstraite)
-- ============================================================
CREATE TABLE utilisateur (
    id                  SERIAL PRIMARY KEY,
    nom                 VARCHAR(100)        NOT NULL,
    email               VARCHAR(150)        NOT NULL UNIQUE,
    mot_de_passe_hash   VARCHAR(255)        NOT NULL,
    role                role_enum           NOT NULL,
    actif               BOOLEAN             NOT NULL DEFAULT TRUE,
    derniere_connexion  TIMESTAMP           NULL,
    created_at          TIMESTAMP           NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE utilisateur IS 'Table principale des utilisateurs — Admin et Technicien';
COMMENT ON COLUMN utilisateur.mot_de_passe_hash IS 'Mot de passe hashé avec bcrypt — jamais en clair';
COMMENT ON COLUMN utilisateur.role IS 'ADMINISTRATEUR ou TECHNICIEN';

-- ============================================================
-- TABLE : administrateur (hérite de utilisateur)
-- ============================================================
CREATE TABLE administrateur (
    id  INTEGER PRIMARY KEY REFERENCES utilisateur(id) ON DELETE CASCADE
);

COMMENT ON TABLE administrateur IS 'Extension de utilisateur pour le rôle Administrateur';

-- ============================================================
-- TABLE : technicien (hérite de utilisateur)
-- ============================================================
CREATE TABLE technicien (
    id  INTEGER PRIMARY KEY REFERENCES utilisateur(id) ON DELETE CASCADE
);

COMMENT ON TABLE technicien IS 'Extension de utilisateur pour le rôle Technicien';

-- ============================================================
-- TABLE : historique_connexion
-- ============================================================
CREATE TABLE historique_connexion (
    id              SERIAL      PRIMARY KEY,
    utilisateur_id  INTEGER     NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    date_connexion  TIMESTAMP   NOT NULL DEFAULT NOW(),
    adresse_ip      VARCHAR(45) NOT NULL,
    statut          statut_connexion_enum NOT NULL
);

COMMENT ON TABLE historique_connexion IS 'Traçabilité complète des connexions';
COMMENT ON COLUMN historique_connexion.adresse_ip IS 'IPv4 ou IPv6 — max 45 caractères';
COMMENT ON COLUMN historique_connexion.statut IS 'Succes ou Echec';

-- ============================================================
-- TABLE : equipement
-- ============================================================
CREATE TABLE equipement (
    id          SERIAL          PRIMARY KEY,
    adresse_ip  VARCHAR(45)     NOT NULL UNIQUE,
    adresse_mac VARCHAR(17)     NULL,
    hostname    VARCHAR(255)    NULL,
    type        type_equipement_enum     NOT NULL DEFAULT 'INCONNU',
    statut      statut_enum     NOT NULL DEFAULT 'INCONNU',
    dernier_vu  TIMESTAMP       NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    seuil_cpu_warning FLOAT     NOT NULL DEFAULT 70.0,
    seuil_cpu_critique FLOAT    NOT NULL DEFAULT 90.0,
    seuil_ram_warning FLOAT     NOT NULL DEFAULT 75.0,
    seuil_ram_critique FLOAT    NOT NULL DEFAULT 90.0,
    seuil_bp_warning FLOAT      NOT NULL DEFAULT 800.0, -- Mbps
    seuil_bp_critique FLOAT     NOT NULL DEFAULT 950.0
);

COMMENT ON TABLE equipement IS 'Equipements réseau découverts par Nmap';
COMMENT ON COLUMN equipement.adresse_mac IS 'Format XX:XX:XX:XX:XX:XX';
COMMENT ON COLUMN equipement.type IS 'Serveur, Routeur, Switch, PC, Inconnu';

-- ============================================================
-- TABLE : port
-- ============================================================
CREATE TABLE port (
    id              SERIAL      PRIMARY KEY,
    equipement_id   INTEGER     NOT NULL REFERENCES equipement(id) ON DELETE CASCADE,
    numero          INTEGER     NOT NULL CHECK (numero BETWEEN 1 AND 65535),
    protocole       VARCHAR(5)  NOT NULL CHECK (protocole IN ('TCP', 'UDP')),
    service         VARCHAR(100) NULL,
    ouvert          BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (equipement_id, numero, protocole)
);

COMMENT ON TABLE port IS 'Ports ouverts détectés par Nmap sur chaque équipement';

-- ============================================================
-- TABLE : alerte
-- ============================================================
CREATE TABLE alerte (
    id              SERIAL              PRIMARY KEY,
    equipement_id   INTEGER             NOT NULL REFERENCES equipement(id) ON DELETE CASCADE,
    message         TEXT                NOT NULL,
    niveau          niveau_alerte_enum  NOT NULL,
    score_anomalie  FLOAT               NOT NULL DEFAULT 0.0,
    valeur_cpu       FLOAT               NOT NULL DEFAULT 0.0,
    valeur_ram       FLOAT               NOT NULL DEFAULT 0.0,
    valeur_bp        FLOAT               NOT NULL DEFAULT 0.0,
    timestamp       TIMESTAMP           NOT NULL DEFAULT NOW(),
    acquittee       BOOLEAN             NOT NULL DEFAULT FALSE,
    acquitte_par    INTEGER             NULL REFERENCES utilisateur(id) ON DELETE SET NULL,
    acquitte_le     TIMESTAMP           NULL
);

COMMENT ON TABLE alerte IS 'Incidents détectés par Isolation Forest';
COMMENT ON COLUMN alerte.score_anomalie IS 'Score calculé par Isolation Forest — plus élevé = plus anormal';
COMMENT ON COLUMN alerte.acquitte_par IS 'ID utilisateur qui a acquitté lalerte';

-- ============================================================
-- TABLE : notification
-- ============================================================
CREATE TABLE notification (
    id          SERIAL      PRIMARY KEY,
    alerte_id   INTEGER     NOT NULL REFERENCES alerte(id) ON DELETE CASCADE,
    canal       canal_enum  NOT NULL,
    destinataire VARCHAR(255) NOT NULL,
    contenu     TEXT        NOT NULL,
    envoye      BOOLEAN     NOT NULL DEFAULT FALSE,
    envoye_le   TIMESTAMP   NULL
);

COMMENT ON TABLE notification IS 'Notifications envoyées via Telegram ou Email';
COMMENT ON COLUMN notification.destinataire IS 'Chat ID Telegram ou adresse email';

-- ============================================================
-- TABLE : rapport
-- ============================================================
CREATE TABLE rapport (
    id              SERIAL      PRIMARY KEY,
    utilisateur_id  INTEGER     NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    titre           VARCHAR(255) NOT NULL,
    periode_debut   TIMESTAMP   NOT NULL,
    periode_fin     TIMESTAMP   NOT NULL,
    format          format_rapport_enum NOT NULL,
    chemin_fichier  VARCHAR(500) NULL,
    date_generation TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Modification la table rapport
ALTER TABLE rapport 
ADD COLUMN type_generation type_generation_enum NOT NULL DEFAULT 'MANUEL';

COMMENT ON TABLE rapport IS 'Rapports générés en PDF, Excel ou CSV';

-- ============================================================
-- INDEX pour optimiser les requêtes fréquentes
-- ============================================================

-- Recherche par email (login)
CREATE INDEX idx_utilisateur_email
    ON utilisateur(email);

-- Filtrer alertes par équipement
CREATE INDEX idx_alerte_equipement
    ON alerte(equipement_id);

-- Filtrer alertes par niveau
CREATE INDEX idx_alerte_niveau
    ON alerte(niveau);

-- Filtrer alertes non acquittées
CREATE INDEX idx_alerte_acquittee
    ON alerte(acquittee);

-- Historique connexions par utilisateur
CREATE INDEX idx_historique_utilisateur
    ON historique_connexion(utilisateur_id);

-- Ports par équipement
CREATE INDEX idx_port_equipement
    ON port(equipement_id);

-- Rapports par utilisateur
CREATE INDEX idx_rapport_utilisateur
    ON rapport(utilisateur_id);

-- Equipement par statut
CREATE INDEX idx_equipement_statut 
    ON equipement(statut);

-- ============================================================
-- FIN DU SCHEMA
-- ============================================================