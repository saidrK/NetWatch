#!/usr/bin/env python3
"""
Script de découverte réseau via Nmap
"""

import nmap
import psycopg2
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Connexion PostgreSQL
def get_db_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# Scanner le réseau 
def scanner_reseau(plage_ip: str) -> list:
    """
    Lance un scan Nmap sur la plage IP
    Retourne la liste des équipements détectés
    """
    print(f"[*] Scan en cours sur : {plage_ip}")
    nm = nmap.PortScanner()

    # -sV : détection services
    # -O  : détection OS
    # -T4 : vitesse rapide
    nm.scan(hosts=plage_ip, arguments="-sV -T4 --open")

    equipements = []
    for host in nm.all_hosts():
        if nm[host].state() == "up":
            equipement = {
                "adresse_ip"  : host,
                "adresse_mac" : nm[host]["addresses"].get("mac", None),
                "hostname"    : nm[host].hostname() or None,
                "type"        : detecter_type(nm[host]),
                "statut"      : "EN_LIGNE",
                "dernier_vu"  : datetime.now(),
                "ports"       : []
            }

            # Récupérer les ports ouverts
            for proto in nm[host].all_protocols():
                for port in nm[host][proto].keys():
                    info = nm[host][proto][port]
                    if info["state"] == "open":
                        equipement["ports"].append({
                            "numero"    : port,
                            "protocole" : proto.upper(),
                            "service"   : info.get("name", "unknown"),
                            "ouvert"    : True
                        })

            equipements.append(equipement)
            print(f"  [+] {host} — {equipement['type']} — {len(equipement['ports'])} ports")

    print(f"[✓] {len(equipements)} équipements détectés")
    return equipements


# Détecter le type d'équipement
def detecter_type(host_info) -> str:
    """Détermine le type selon les ports ouverts"""
    try:
        ports = list(host_info["tcp"].keys()) if "tcp" in host_info else []
    except:
        ports = []

    if 22 in ports and 80 in ports:
        return "SERVEUR"
    elif 80 in ports or 443 in ports:
        return "SERVEUR"
    elif 161 in ports:
        return "ROUTEUR"
    elif 23 in ports:
        return "SWITCH"
    else:
        return "INCONNU"


# Sauvegarder dans PostgreSQL
def sauvegarder_equipements(equipements: list):
    """
    Insère ou met à jour les équipements dans PostgreSQL
    Utilise UPSERT pour éviter les doublons
    """
    conn = get_db_connection()
    cur = conn.cursor()

    for eq in equipements:
        # UPSERT équipement
        cur.execute("""
            INSERT INTO equipement 
                (adresse_ip, adresse_mac, hostname, type, statut, dernier_vu)
            VALUES 
                (%(adresse_ip)s, %(adresse_mac)s, %(hostname)s, 
                 %(type)s, %(statut)s, %(dernier_vu)s)
            ON CONFLICT (adresse_ip) DO UPDATE SET
                adresse_mac = EXCLUDED.adresse_mac,
                hostname    = EXCLUDED.hostname,
                type        = EXCLUDED.type,
                statut      = EXCLUDED.statut,
                dernier_vu  = EXCLUDED.dernier_vu
            RETURNING id
        """, eq)

        equipement_id = cur.fetchone()[0]

        # Supprimer anciens ports
        cur.execute("DELETE FROM port WHERE equipement_id = %s", 
                   (equipement_id,))

        # Insérer nouveaux ports
        for port in eq["ports"]:
            cur.execute("""
                INSERT INTO port 
                    (equipement_id, numero, protocole, service, ouvert)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (equipement_id, numero, protocole) DO NOTHING
            """, (
                equipement_id,
                port["numero"],
                port["protocole"],
                port["service"],
                port["ouvert"]
            ))

    conn.commit()
    cur.close()
    conn.close()
    print(f"[✓] {len(equipements)} équipements sauvegardés dans PostgreSQL")


# Marquer les équipements hors ligne
def marquer_hors_ligne(equipements_detectes: list):
    """
    Marque HORS_LIGNE les équipements non détectés dans ce scan
    """
    conn = get_db_connection()
    cur = conn.cursor()

    if equipements_detectes:
        ips_detectees = [eq["adresse_ip"] for eq in equipements_detectes]
        cur.execute("""
            UPDATE equipement 
            SET statut = 'HORS_LIGNE'
            WHERE adresse_ip != ALL(%s)
        """, (ips_detectees,))
    else:
        cur.execute("UPDATE equipement SET statut = 'HORS_LIGNE'")

    conn.commit()
    cur.close()
    conn.close()


# Main
def lancer_scan(plage_ip: str = None):
    """Point d'entrée principal"""
    if not plage_ip:
        plage_ip = os.getenv("RESEAU_PLAGE", "192.168.1.0/24")

    print(f"\n{'='*50}")
    print(f"  SCAN RÉSEAU — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")

    # 1. Scanner
    equipements = scanner_reseau(plage_ip)

    if equipements:
        # 2. Sauvegarder
        sauvegarder_equipements(equipements)

        # 3. Marquer hors ligne
        marquer_hors_ligne(equipements)

    print(f"\n[✓] Scan terminé — {len(equipements)} équipements actifs\n")
    return equipements


if __name__ == "__main__":
    lancer_scan()