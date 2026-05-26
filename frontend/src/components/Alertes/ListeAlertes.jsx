/**
 * ListeAlertes — Liste des alertes avec filtres et acquittement (BF05)
 * Affiche les alertes avec possibilité de les acquitter
 */
import { useEffect, useState } from 'react'
import { alertesAPI } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertTriangle, CheckCircle, Search, RefreshCw, Clock } from 'lucide-react'

export default function ListeAlertes() {
  const [alertes, setAlertes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterNiveau, setFilterNiveau] = useState('tous')
  const [filterStatut, setFilterStatut] = useState('tous')

  const fetchAlertes = async () => {
    setLoading(true)
    try {
      const { data } = await alertesAPI.lister()
      setAlertes(data)
    } catch (error) {
      console.error('Erreur chargement alertes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlertes()
  }, [])

  const handleAcquitter = async (id) => {
    try {
      await alertesAPI.acquitter(id)
      // Mettre à jour localement
      setAlertes(alertes.map((a) => (a.id === id ? { ...a, acquittee: true } : a)))
    } catch (error) {
      console.error('Erreur acquittement alerte:', error)
    }
  }

  const filteredAlertes = alertes.filter((a) => {
    const matchSearch = a.message?.toLowerCase().includes(filter.toLowerCase())
    const matchNiveau =
      filterNiveau === 'tous' ||
      (filterNiveau === 'critique' && a.niveau === 'CRITIQUE') ||
      (filterNiveau === 'warning' && a.niveau === 'WARNING')
    const matchStatut =
      filterStatut === 'tous' ||
      (filterStatut === 'non_acquittees' && !a.acquittee) ||
      (filterStatut === 'acquittees' && a.acquittee)
    return matchSearch && matchNiveau && matchStatut
  })

  const nonAcquitteesCount = alertes.filter((a) => !a.acquittee).length

  return (
    <div className="space-y-4">
      {/* Badge compteur */}
      {nonAcquitteesCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {nonAcquitteesCount} alerte(s) non acquittée(s)
          </Badge>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher dans les alertes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterNiveau}
          onChange={(e) => setFilterNiveau(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="tous">Tous les niveaux</option>
          <option value="critique">Critique</option>
          <option value="warning">Warning</option>
        </select>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="tous">Tous les statuts</option>
          <option value="non_acquittees">Non acquittées</option>
          <option value="acquittees">Acquittées</option>
        </select>
        <Button onClick={fetchAlertes} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle>Alertes ({filteredAlertes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : filteredAlertes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune alerte trouvée
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlertes.map((alerte) => (
                <div
                  key={alerte.id}
                  className={`p-4 border rounded-lg ${
                    alerte.acquittee ? 'bg-gray-50 opacity-60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {alerte.niveau === 'CRITIQUE' ? (
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={alerte.niveau === 'CRITIQUE' ? 'destructive' : 'secondary'}
                          >
                            {alerte.niveau}
                          </Badge>
                          {alerte.acquittee && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acquittée
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{alerte.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(alerte.timestamp).toLocaleString()}
                          </span>
                          {alerte.equipement_id && (
                            <span>Équipement #{alerte.equipement_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {!alerte.acquittee && (
                      <Button
                        onClick={() => handleAcquitter(alerte.id)}
                        variant="outline"
                        size="sm"
                      >
                        Acquitter
                      </Button>
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
