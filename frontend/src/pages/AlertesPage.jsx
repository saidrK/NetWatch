/**
 * AlertesPage — Page de gestion des alertes (BF05)
 * Affiche la liste des alertes avec filtres et acquittement
 */
import ListeAlertes from '@/components/Alertes/ListeAlertes'

export default function AlertesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Alertes</h2>
        <p className="text-muted-foreground">
          Gestion et acquittement des alertes (BF05)
        </p>
      </div>
      <ListeAlertes />
    </div>
  )
}
