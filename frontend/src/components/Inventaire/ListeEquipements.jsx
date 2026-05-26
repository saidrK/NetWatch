/**
 * ListeEquipements — Tableau filtrable des équipements (BF02)
 * Affiche la liste des équipements avec filtres et statut live
 */
import { useEffect, useState } from 'react'
import { equipementsAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react'

export default function ListeEquipements() {
  const [equipements, setEquipements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')

  const fetchEquipements = async () => {
    setLoading(true)
    try {
      const { data } = await equipementsAPI.lister()
      setEquipements(data)
    } catch (error) {
      console.error('Erreur chargement équipements:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEquipements()
  }, [])

  const filteredEquipements = equipements.filter((eq) => {
    const matchSearch =
      eq.hostname?.toLowerCase().includes(filter.toLowerCase()) ||
      eq.adresse_ip?.includes(filter)
    const matchStatut =
      filterStatut === 'tous' ||
      (filterStatut === 'en_ligne' && eq.statut === 'EN_LIGNE') ||
      (filterStatut === 'hors_ligne' && eq.statut === 'HORS_LIGNE')
    return matchSearch && matchStatut
  })

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher par hostname ou IP..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="tous">Tous les statuts</option>
          <option value="en_ligne">En ligne</option>
          <option value="hors_ligne">Hors ligne</option>
        </select>
        <Button onClick={fetchEquipements} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle>Équipements réseau ({filteredEquipements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredEquipements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun équipement trouvé
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEquipements.map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {eq.statut === 'EN_LIGNE' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{eq.hostname || 'N/A'}</p>
                      <p className="text-sm text-gray-500">{eq.adresse_ip}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{eq.type || 'Inconnu'}</Badge>
                    <Badge
                      variant={eq.statut === 'EN_LIGNE' ? 'default' : 'destructive'}
                    >
                      {eq.statut === 'EN_LIGNE' ? 'En ligne' : 'Hors ligne'}
                    </Badge>
                    {eq.dernier_vu && (
                      <span className="text-xs text-gray-500">
                        Vu: {new Date(eq.dernier_vu).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
