import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function RapportsPage() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Rapports</CardTitle>
        <CardDescription>ListeRapports · GenererRapport · BF07</CardDescription>
      </CardHeader>
    </Card>
  )
}
