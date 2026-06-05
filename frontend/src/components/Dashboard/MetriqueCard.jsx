/**
 * MetriqueCard — Carte métrique avec icône et valeur
 * Affiche une métrique clé (CPU, RAM, Bande passante, etc.)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Cpu, HardDrive, Network, Server, AlertTriangle, CheckCircle } from 'lucide-react'

const ICONS = {
  cpu: Cpu,
  ram: HardDrive,
  network: Network,
  server: Server,
  alert: AlertTriangle,
  success: CheckCircle,
  activity: Activity,
}

const COLORS = {
  default: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
}

export default function MetriqueCard({ title, value, unit, icon = 'activity', color = 'default', trend }) {
  const Icon = ICONS[icon] || ICONS.activity
  const colorClass = COLORS[color] || COLORS.default

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value} {unit && <span className="text-sm font-normal text-gray-500">{unit}</span>}
        </div>
        {trend !== undefined && (
          <p className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}% par rapport à hier
          </p>
        )}
      </CardContent>
    </Card>
  )
}
