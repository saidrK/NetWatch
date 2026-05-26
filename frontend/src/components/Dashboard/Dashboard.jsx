/**
 * Dashboard — Vue d'ensemble réseau temps réel (BF03)
 * Affiche les métriques globales et l'état des équipements via WebSocket
 */
import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import MetriqueCard from './MetriqueCard'
import GraphiqueMetrique from './GraphiqueMetrique'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function Dashboard() {
  const { data, connected, error } = useWebSocket()
  const [resume, setResume] = useState(null)
  const [equipements, setEquipements] = useState([])
  const [alertes, setAlertes] = useState([])

  useEffect(() => {
    if (data && data.type === 'dashboard_update') {
      setResume(data.resume)
      setEquipements(data.equipements || [])
      setAlertes(data.alertes || [])
    }
  }, [data])

  if (!connected && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Connexion au dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <p>Erreur de connexion WebSocket. Vérifiez que le backend est démarré.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!resume) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">En attente des données...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Indicateur de connexion */}
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {connected ? 'Connecté en temps réel' : 'Déconnecté'}
        </span>
      </div>

      {/* Cartes métriques globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetriqueCard
          title="Équipements totaux"
          value={resume.total_equipements}
          icon="server"
          color="default"
        />
        <MetriqueCard
          title="En ligne"
          value={resume.en_ligne}
          icon="success"
          color="success"
        />
        <MetriqueCard
          title="Hors ligne"
          value={resume.hors_ligne}
          icon="alert"
          color="danger"
        />
        <MetriqueCard
          title="Alertes actives"
          value={resume.alertes_critiques + resume.alertes_warnings}
          icon="alert"
          color={resume.alertes_critiques > 0 ? 'danger' : 'warning'}
        />
      </div>

      {/* Alertes récentes */}
      {alertes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alertes récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertes.slice(0, 5).map((alerte) => (
                <div
                  key={alerte.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={alerte.niveau === 'CRITIQUE' ? 'destructive' : 'secondary'}
                    >
                      {alerte.niveau}
                    </Badge>
                    <span className="text-sm">{alerte.message}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(alerte.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* État des équipements */}
      <Card>
        <CardHeader>
          <CardTitle>État des équipements</CardTitle>
        </CardHeader>
        <CardContent>
          {equipements.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun équipement détecté</p>
          ) : (
            <div className="space-y-2">
              {equipements.map((eq) => (
                <div
                  key={eq.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {eq.statut === 'EN_LIGNE' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{eq.hostname}</p>
                      <p className="text-sm text-gray-500">{eq.adresse_ip}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{eq.type}</Badge>
                    {eq.niveau_ia && eq.niveau_ia !== 'NORMAL' && (
                      <Badge
                        variant={eq.niveau_ia === 'CRITIQUE' ? 'destructive' : 'secondary'}
                      >
                        IA: {eq.niveau_ia}
                      </Badge>
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
