import { useState, useEffect } from 'react'
import { Activity, Database, BrainCircuit, Loader2 } from 'lucide-react'
import api from '@/services/api' // Instance Axios pointant sur /api/v1

export default function SystemHealthIndicator() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // La route /health est souvent à la racine de l'API, ou dans v1. 
    // On va utiliser axios brut si elle n'est pas sous /api/v1, ou api.get si elle l'est.
    // D'après docker-compose, c'est http://localhost:8000/health, 
    // donc potentiellement en dehors de /api/v1.
    const fetchHealth = async () => {
      try {
        // En supposant que le proxy redirige /api/health -> backend:8000/health
        // Ou que la route soit gérée. Ajustez l'URL selon votre config FastAPI
        const res = await api.get('/health', { baseURL: import.meta.env.VITE_API_URL || '/api' })
        setHealth(res.data)
      } catch (err) {
        setHealth({ status: 'error' })
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 30000) // Poll toutes les 30s
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-[#888]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        VÉRIFICATION SYSTÈME...
      </div>
    )
  }

  // Fallback si la route renvoie un simple "ok" au lieu d'un objet détaillé
  const isHealthy = health?.status === 'ok' || health?.status === 'healthy' || health?.postgres === 'ok' || (health && !health.error && health.status !== 'error')
  
  // Design Cyan Neon / Crit-Red
  const color = isHealthy ? '#00FFD1' : '#FF4E00'
  const glow = isHealthy ? 'shadow-[0_0_8px_rgba(0,255,209,0.6)]' : 'shadow-[0_0_8px_rgba(255,78,0,0.6)]'
  const textColor = isHealthy ? 'text-[#00FFD1]' : 'text-[#FF4E00]'

  return (
    <div className={`flex items-center gap-4 px-3 py-1.5 border border-[#222] bg-[#0D0D0D] font-mono text-[10px] uppercase tracking-widest ${textColor}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full bg-current ${glow} ${isHealthy ? 'animate-pulse' : ''}`} />
        <span>SYS: {isHealthy ? 'ONLINE' : 'CRITICAL'}</span>
      </div>

      {/* Si l'API détaille les services, on les affiche */}
      {health && typeof health === 'object' && health.postgres && (
        <div className="flex items-center gap-3 border-l border-[#333] pl-3 ml-1 opacity-75">
          <div className="flex items-center gap-1" title="PostgreSQL">
            <Database className="w-3 h-3" />
            <span className={health.postgres === 'ok' ? 'text-[#00FFD1]' : 'text-[#FF4E00]'}>
              {health.postgres === 'ok' ? 'UP' : 'ERR'}
            </span>
          </div>
          <div className="flex items-center gap-1" title="InfluxDB">
            <Activity className="w-3 h-3" />
            <span className={health.influxdb === 'ok' ? 'text-[#00FFD1]' : 'text-[#FF4E00]'}>
              {health.influxdb === 'ok' ? 'UP' : 'ERR'}
            </span>
          </div>
          <div className="flex items-center gap-1" title="IA Engine">
            <BrainCircuit className="w-3 h-3" />
            <span className={health.ia === 'ok' ? 'text-[#00FFD1]' : 'text-[#FF4E00]'}>
              {health.ia === 'ok' ? 'UP' : 'ERR'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
