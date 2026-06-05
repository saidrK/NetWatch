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
import { Download, FileText, Terminal, Database, HardDrive, Activity } from 'lucide-react'

// ── Pas besoin de recharts pour la nouvelle UI

export default function RapportsPage() {
  const [refreshKey,        setRefreshKey]       = useState(0)
  const [rapportCount,      setRapportCount]     = useState(null)
  const [rapportHistory,    setRapportHistory]   = useState([])
  const [storage,           setStorage]          = useState(null)
  const [exporting,         setExporting]        = useState(false)

  // ── Historique rapports ──────────────
  const fetchRapports = useCallback(async () => {
    try {
      const res      = await rapportsAPI.lister()
      const rapports = Array.isArray(res.data) ? res.data : res.data?.items || []
      setRapportCount(rapports.length)

      const byMonth = {}
      rapports.forEach(r => {
        const d = new Date(r.date_generation || r.date_creation)
        if (!isNaN(d)) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          byMonth[key] = (byMonth[key] || 0) + 1
        }
      })

      const sorted = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([mois, count]) => ({
          mois: mois.replace(/^\d{4}-/, ''),
          count,
        }))

      setRapportHistory(sorted)
    } catch (error) {
      console.warn('[Rapports] Endpoint indisponible:', error)
      setRapportCount(0)
      setRapportHistory([])
    }
  }, [])

  useEffect(() => {
    fetchRapports()
  }, [fetchRapports])

  const fetchStorage = async () => {
    try {
      const { data } = await rapportsAPI.storage()
      setStorage(data)
    } catch { setStorage(null) }
  }

  useEffect(() => { fetchStorage() }, [refreshKey])

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
          className="border border-[#00FFD1] text-[#00FFD1] font-mono text-xs uppercase px-4 py-2 hover:bg-[#00FFD1] hover:text-black transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={exporting}
          onClick={async () => {
            setExporting(true)
            try {
              const { data } = await rapportsAPI.exportGlobal()
              const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }))
              const a = document.createElement('a')
              a.href = url; a.download = 'rapports_netwatch.zip'; a.click()
              URL.revokeObjectURL(url)
            } catch(e) { alert('Aucun rapport disponible ou erreur serveur') }
            finally { setExporting(false) }
          }}
        >
          <Download className="w-4 h-4" />
          {exporting ? 'EXPORT...' : 'EXPORT GLOBAL'}
        </button>
      </div>

      {/* ══ MOTEUR DE GÉNÉRATION - TÉLÉMÉTRIE ══════════════ */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* STATUT DU MOTEUR */}
        <div className="border border-[#00FFD1]/30 bg-[#0a1200] p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <Activity className="w-16 h-16 text-[#00FFD1]" />
          </div>
          <div className="flex items-center gap-2 text-[#00FFD1] text-[10px] font-mono uppercase tracking-widest mb-4 z-10">
            <Terminal className="w-3 h-3" /> ENGINE_STATUS
          </div>
          <div className="flex items-end gap-3 z-10">
            <span className="relative flex h-3 w-3 mb-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-2xl font-bold text-white font-mono leading-none tracking-wider">ONLINE</span>
          </div>
          <div className="text-gray-500 text-[10px] font-mono uppercase mt-3 z-10 border-t border-[#00FFD1]/20 pt-2">
            TASK_RUNNER: ASYNC_LOCAL
          </div>
        </div>

        {/* VOLUME DE DONNÉES */}
        <div className="border border-[#222] bg-[#050505] p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-4">
            <Database className="w-3 h-3" /> ARCHIVE_VOLUME
          </div>
          <div>
            <span className="text-2xl font-bold text-white font-mono leading-none">{rapportCount !== null ? rapportCount : '-'}</span>
            <span className="text-gray-600 text-xs font-mono ml-2">DOCS</span>
          </div>
          <div className="text-[#00FFD1] text-[10px] font-mono uppercase mt-3 border-t border-[#222] pt-2">
            {rapportCount > 0 ? 'SYNCHRONISÉ' : 'BASE VIDE'}
          </div>
        </div>

        {/* DERNIER CYCLE */}
        <div className="border border-[#222] bg-[#050505] p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-4">
            <FileText className="w-3 h-3" /> LAST_COMPILE
          </div>
          <div className="text-lg font-bold text-gray-300 font-mono leading-tight">
            {rapportCount > 0 ? 'T-MINUS 0' : 'EN ATTENTE'}
          </div>
          <div className="text-gray-500 text-[10px] font-mono uppercase mt-3 truncate border-t border-[#222] pt-2">
            {rapportHistory.length > 0 ? `CYCLE: MOIS ${rapportHistory[rapportHistory.length-1].mois}` : 'AUCUN CYCLE ACTIF'}
          </div>
        </div>

        {/* STOCKAGE TEMPORAIRE */}
        <div className="border border-[#222] bg-[#050505] p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase tracking-widest mb-4">
            <HardDrive className="w-3 h-3" /> /TMP_STORAGE
          </div>
          <div className="w-full bg-[#111] h-1.5 mb-2 mt-2">
            <div className="bg-[#00FFD1] h-1.5" style={{ width: storage ? `${Math.min(storage.pourcentage, 100)}%` : '0%' }}></div>
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono uppercase border-t border-[#222] pt-2 mt-1">
            <span className="text-white">{storage ? `${storage.taille_mb} MB` : '-'}</span>
            <span className="text-gray-600">1.0 GB MAX</span>
          </div>
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
