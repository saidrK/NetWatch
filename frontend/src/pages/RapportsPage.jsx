/**
 * RapportsPage.jsx — Rapports de supervision
 * KPIs réels : alertesAPI + useWebSocket
 * Graphique dynamique : BarChart historique des rapports (par mois)
 * Zéro valeur hardcodée dans les KPI
 */
import { useState, useEffect, useCallback } from 'react'
import ListeRapports  from '@/components/Rapports/ListeRapports'
import GenererRapport from '@/components/Rapports/GenererRapport'
import { alertesAPI, rapportsAPI } from '@/services/api'
import { Download, FileText } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'

const CYAN   = '#00FFD1'
const ORANGE = '#FF4E00'
const YELLOW = '#FFD700'

// ── Tooltip personnalisé ──────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0D0D0D] border border-[#222] px-3 py-2 text-xs font-mono">
      <p className="text-gray-500 mb-1">{label}</p>
      <p style={{ color: CYAN }}>{payload[0].value} rapport{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function RapportsPage() {
  const [refreshKey,        setRefreshKey]       = useState(0)
  const [rapportCount,      setRapportCount]     = useState(null)
  const [rapportHistory,    setRapportHistory]   = useState([])   // [{mois, count}]

  // ── Historique rapports (stats par mois) ──────────────
  const fetchRapports = useCallback(async () => {
    try {
      const res      = await rapportsAPI.lister()
      const rapports = Array.isArray(res.data) ? res.data : res.data?.items || []
      setRapportCount(rapports.length)

      // Grouper par mois (YYYY-MM)
      const byMonth = {}
      rapports.forEach(r => {
        const d = new Date(r.date_generation || r.date_creation)
        if (!isNaN(d)) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          byMonth[key] = (byMonth[key] || 0) + 1
        }
      })

      // Transformer en tableau trié (6 derniers mois)
      const sorted = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([mois, count]) => ({
          mois: mois.replace(/^\d{4}-/, ''),  // ex: "06"
          count,
        }))

      setRapportHistory(sorted)
    } catch (error) {
      // Gestion silencieuse mais état propre
      console.warn('[Rapports] Endpoint indisponible:', error)
      setRapportCount(0) // État vide propre, pas en attente indéfinie
      setRapportHistory([])
    }
  }, [])

  useEffect(() => {
    fetchRapports()
  }, [fetchRapports])

  const handleRapportGenere = () => {
    setRefreshKey(prev => prev + 1)
    fetchRapports()
  }

  return (
    <div className="flex flex-col gap-8 font-mono p-6 crt-flicker">

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div className="border-b border-[#222] pb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
            RAPPORTS_HEBDO
          </h2>
          <p className="text-xs text-[#888] uppercase tracking-wider">
            Compte-rendus asynchrones &amp; logs d'infrastructure • API Engine
          </p>
        </div>
        <button
          className="border border-[#00FFD1] text-[#00FFD1] font-mono text-xs uppercase px-4 py-2 hover:bg-[#00FFD1] hover:text-black transition-all flex items-center gap-2 opacity-40 cursor-not-allowed"
          disabled
        >
          <Download className="w-4 h-4" />
          EXPORT GLOBAL
        </button>
      </div>

      {/* ══ GRAPHIQUE : HISTORIQUE RAPPORTS PAR MOIS ════════ */}
      <section className="cyber-card flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-3">
          <span className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: CYAN }} />
            HISTORIQUE DES RAPPORTS GÉNÉRÉS
          </span>
          <span className="text-xs text-gray-600 font-mono">
            {rapportCount !== null ? `${rapportCount} TOTAL` : 'CHARGEMENT...'}
          </span>
        </div>

        <div style={{ height: 180 }}>
          {rapportHistory.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm font-mono animate-pulse">
              {rapportCount === null ? 'Chargement...' : 'Aucun rapport enregistré'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rapportHistory} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" strokeOpacity={0.6} />
                <XAxis
                  dataKey="mois"
                  tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false} axisLine={{ stroke: '#222' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#555', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false} axisLine={false} width={24}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={0} maxBarSize={40}>
                  {rapportHistory.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === rapportHistory.length - 1 ? CYAN : CYAN + '55'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ══ FILTRES ═════════════════════════════════════════ */}
      <div className="flex items-center gap-8 py-3 border-b border-[#222]">
        <div className="flex items-center gap-3">
          <span className="text-gray-600 text-xs font-mono uppercase">PLAGE:</span>
          <select className="bg-transparent border border-[#333] text-[#00FFD1] font-mono text-xs uppercase px-2 py-1 cursor-pointer focus:border-[#00FFD1] focus:outline-none">
            <option className="bg-black">T-MINUS: 7 JOURS</option>
            <option className="bg-black">T-MINUS: 30 JOURS</option>
            <option className="bg-black">T-MINUS: 24 HEURES</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-600 text-xs font-mono uppercase">CLUSTER:</span>
          <span className="text-[#00FFD1] font-mono text-xs uppercase">
            EQ: TOUS_LES_CLUSTERS
          </span>
        </div>
      </div>

      {/* ══ GÉNÉRATION + LISTE ═══════════════════════════════ */}
      <div className="flex flex-col gap-8">
        <GenererRapport onRapportGenere={handleRapportGenere} />
        <ListeRapports  key={refreshKey} onGenerer={handleRapportGenere} />
      </div>
    </div>
  )
}
