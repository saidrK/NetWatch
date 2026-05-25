import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Vue d&apos;ensemble</h2>
        <p className="text-muted-foreground">
          Métriques temps réel et état du réseau (BF03)
        </p>
      </div>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Branchez ici Dashboard.jsx, MetriqueCard et GraphiqueMetrique (Tremor).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Prochaine étape : données API + WebSocket.
        </CardContent>
      </Card>
    </div>
  )
}
