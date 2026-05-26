/**
 * InventairePage — Page inventaire des équipements (BF02)
 * Affiche la liste filtrable des équipements réseau
 */
import ListeEquipements from '@/components/Inventaire/ListeEquipements'

export default function InventairePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Inventaire réseau</h2>
        <p className="text-muted-foreground">
          Liste et détail des équipements réseau (BF02)
        </p>
      </div>
      <ListeEquipements />
    </div>
  )
}
