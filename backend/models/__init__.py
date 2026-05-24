# Import centralisé pour init_db()
from models.utilisateur import Utilisateur, Administrateur, Technicien, RoleUtilisateur
from models.historique_connexion import HistoriqueConnexion, StatutConnexion
from models.equipement          import Equipement, Port, StatutEquipement, TypeEquipement
from models.alerte              import Alerte, NiveauAlerte
from models.notification        import Notification, Canal
from models.rapport             import Rapport, FormatRapport, TypeGeneration