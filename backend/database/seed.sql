-- ============================================================
-- SEED — Données initiales
-- Mot de passe admin : Admin@1234
-- Mot de passe technicien : Tech@1234
-- ============================================================

-- Insérer l'administrateur par défaut
INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, actif)
VALUES (
    'Administrateur',
    'admin@supervision.local',
    '$2b$12$pLnHgEwClU6a0j4UFSTI2O3PHTwyojejQdg8/Qk/dtFml4cgX6We6',
    'ADMINISTRATEUR',  
    TRUE
);

INSERT INTO administrateur (id) VALUES (1);

-- Insérer un technicien de test
INSERT INTO utilisateur (nom, email, mot_de_passe_hash, role, actif)
VALUES (
    'Technicien Test',
    'technicien@supervision.local',
    '$2b$12$oaa9x.NDq9Rb3LXzi4HlzeKyntjVP6yGGfuiB09Gyf7vYfwyUhCbC',
    'TECHNICIEN',
    TRUE
);

INSERT INTO technicien (id) VALUES (2);

-- Équipement de test : la VM RHEL elle-même
INSERT INTO equipement (
    adresse_ip,
    adresse_mac,
    hostname,
    type,
    statut,
    dernier_vu,
    seuil_cpu_warning,
    seuil_cpu_critique,
    seuil_ram_warning,
    seuil_ram_critique,
    seuil_bp_warning,
    seuil_bp_critique
) VALUES (
    '192.168.1.103',                    -- IP statique de ta VM
    '00:0c:29:04:8f:9e',                -- MAC address 
    'localhost',                        -- hostname
    'SERVEUR',                          -- type ENUM
    'EN_LIGNE',                         -- statut ENUM 
    NOW(),                              -- dernier_vu = maintenant
    70.0,                               -- seuil_cpu_warning
    90.0,                               -- seuil_cpu_critique
    75.0,                               -- seuil_ram_warning
    90.0,                               -- seuil_ram_critique
    800.0,                              -- seuil_bp_warning (Mbps)
    950.0                               -- seuil_bp_critique (Mbps)
);