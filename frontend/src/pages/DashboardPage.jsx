/**
 * DashboardPage — Page principale du dashboard (BF03)
 * Affiche la vue d'ensemble du réseau en temps réel
 */
import Dashboard from '@/components/Dashboard/Dashboard'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h2>
        <p className="text-muted-foreground">
          Métriques temps réel et état du réseau (BF03)
        </p>
      </div>
      <Dashboard />
    </div>
  )
}
