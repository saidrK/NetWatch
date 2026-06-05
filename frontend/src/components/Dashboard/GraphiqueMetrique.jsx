/**
 * GraphiqueMetrique — Graphique temps réel avec Tremor
 * Affiche l'évolution d'une métrique sur le temps
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart } from '@tremor/react'

export default function GraphiqueMetrique({ title, data, dataKey, color = 'blue' }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Aucune donnée disponible</p>
        </CardContent>
      </Card>
    )
  }

  // Formater les données pour Tremor
  const chartData = data.map((item, index) => ({
    time: item.timestamp || `T-${data.length - index}`,
    value: item[dataKey] || 0,
  }))

  const colors = {
    blue: 'blue',
    green: 'emerald',
    red: 'rose',
    yellow: 'amber',
    purple: 'violet',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AreaChart
          className="h-64"
          data={chartData}
          index="time"
          categories={['value']}
          colors={[colors[color] || colors.blue]}
          showLegend={false}
          showYAxis={true}
          showXAxis={true}
          yAxisWidth={48}
        />
      </CardContent>
    </Card>
  )
}
