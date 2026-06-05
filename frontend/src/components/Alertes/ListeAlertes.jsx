import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { alertesAPI } from '@/services/api'
import { Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ─── Constantes de configuration affichées dans le header ───────────────────
const SEUIL_WARNING  = '75%'
const SEUIL_CRITIQUE = '90%'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTimestamp(ts) {
  if (!ts) return 'T-??:??:??'
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `T-${hh}:${mm}:${ss}`
}

function genCodeAlerte(id, niveau) {
  const prefix = 'AX'
  const num    = String(id).padStart(4, '0')
  const letter = niveau ? niveau.charAt(0).toUpperCase() : 'X'
  return `${prefix}-${num}-${letter}`
}

// ─── Tab config ──────────────────────────────────────────────────────────────
const TABS = [
  {
    id:        'ALL',
    label:     'TOUTES',
    activeClass: 'bg-cyan-400 text-black border-cyan-400',
    countColor: 'text-cyan-400',
  },
  {
    id:        'CRITICAL',
    label:     'CRIT',
    activeClass: 'bg-red-500 text-black border-red-500',
    countColor: 'text-red-400',
  },
  {
    id:        'WARNING',
    label:     'WARN',
    activeClass: 'bg-yellow-400 text-black border-yellow-400',
    countColor: 'text-yellow-400',
  },
  {
    id:        'INFO',
    label:     'INFO',
    activeClass: 'bg-blue-400 text-black border-blue-400',
    countColor: 'text-blue-400',
  },
]

// ─── Card level config ────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  CRITIQUE: {
    borderLeft: 'border-l-4 border-red-500',
    bg:         'bg-[#1a0505]',
    badge:      'bg-red-500/20 border border-red-500 text-red-400',
    label:      'CRITICAL_ANOMALY',
    codeColor:  'text-cyan-300',
    btnHover:   'hover:bg-cyan-400 hover:text-black',
  },
  WARNING: {
    borderLeft: 'border-l-4 border-yellow-400',
    bg:         'bg-[#1a1200]',
    badge:      'bg-yellow-500/20 border border-yellow-400 text-yellow-300',
    label:      'HIGH_LOAD_WARN',
    codeColor:  'text-cyan-300',
    btnHover:   'hover:bg-cyan-400 hover:text-black',
  },
  INFO: {
    borderLeft: 'border-l-4 border-blue-400',
    bg:         'bg-[#05050f]',
    badge:      'bg-blue-500/20 border border-blue-400 text-blue-300',
    label:      'INFO_EVENT',
    codeColor:  'text-cyan-300',
    btnHover:   'hover:bg-cyan-400 hover:text-black',
  },
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ListeAlertes() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [alertes, setAlertes]             = useState([])
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState('ALL')
  const [processingIds, setProcessingIds] = useState({})

  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 50

  // ── API calls (inchangés) ──────────────────────────────────────────────────
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
    if (processingIds[id]) return
    setProcessingIds(prev => ({ ...prev, [id]: true }))
    try {
      await alertesAPI.acquitter(id)
      setAlertes(alertes.map((a) => (a.id === id ? { ...a, acquittee: true } : a)))
    } catch (error) {
      console.error('Erreur acquittement alerte:', error)
    } finally {
      setProcessingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  // ── Tri & filtrage (inchangés) ────────────────────────────────────────────
  const sortedAlerts = [...alertes].sort((a, b) => {
    if (a.acquittee !== b.acquittee) return a.acquittee ? 1 : -1
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })

  const filteredAlerts = sortedAlerts.filter(a => {
    if (filter === 'ALL')      return true
    if (filter === 'CRITICAL' && a.niveau === 'CRITIQUE') return true
    if (filter === 'WARNING'  && a.niveau === 'WARNING')  return true
    if (filter === 'INFO'     && a.niveau === 'INFO')     return true
    return false
  })

  // ── Compteurs ─────────────────────────────────────────────────────────────
  const countAll  = alertes.filter(a => !a.acquittee).length
  const countCrit = alertes.filter(a => a.niveau === 'CRITIQUE' && !a.acquittee).length
  const countWarn = alertes.filter(a => a.niveau === 'WARNING'  && !a.acquittee).length
  const countInfo = alertes.filter(a => a.niveau === 'INFO'     && !a.acquittee).length

  const counts = { ALL: countAll, CRITICAL: countCrit, WARNING: countWarn, INFO: countInfo }

  const totalPages     = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE))
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 font-mono p-6 crt-flicker">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <section className="bg-[#050505]/95 py-4 border-b border-[#222] flex flex-col gap-2 sticky top-0 z-10">
        {/* Titre + modèle */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <span className="font-bold text-cyan-400 uppercase tracking-[0.15em] text-sm">
              SYS_LIVE_FEED_ALERTES
            </span>
          </div>
          <span className="text-gray-600 text-[10px] font-mono">MODÈLE: ENUM-NIVEAUALERTE</span>
        </div>

        {/* Ligne de statut temps réel */}
        <div className="text-[10px] font-mono text-gray-600 mb-1">
          ISOLATION_FOREST&nbsp;•&nbsp;SEUIL_WARNING:&nbsp;{SEUIL_WARNING}&nbsp;•&nbsp;SEUIL_CRITIQUE:&nbsp;{SEUIL_CRITIQUE}&nbsp;•&nbsp;REFRESH:&nbsp;WEBSOCKET_LIVE
        </div>

        {/* ── TABS FILTRES ─────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 select-none">
          {TABS.map(tab => {
            const isActive = filter === tab.id
            const count    = counts[tab.id]
            const countCls = count === 0 ? 'text-gray-600' : (isActive ? '' : tab.countColor)

            return (
              <button
                key={tab.id}
                onClick={() => { setFilter(tab.id); setCurrentPage(1) }}
                className={[
                  'flex-shrink-0 font-mono text-xs uppercase px-3 py-1.5 rounded-none transition-all',
                  isActive
                    ? `${tab.activeClass} border font-bold`
                    : 'bg-transparent border border-gray-600 text-gray-500 hover:border-cyan-600 hover:text-cyan-400 font-bold',
                ].join(' ')}
              >
                {tab.label}&nbsp;
                <span className={isActive ? '' : countCls}>[{count}]</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── FEED ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="text-xs text-gray-500 italic py-6 font-mono">
            INIT_LOAD — chargement du flux système…
          </div>

        ) : paginatedAlerts.length > 0 ? (
          paginatedAlerts.map((alerte) => {
            const niveau      = alerte.niveau || 'INFO'
            const cfg         = LEVEL_CONFIG[niveau] || LEVEL_CONFIG['INFO']
            const isAcquitted = alerte.acquittee
            const isProcessing = !!processingIds[alerte.id]
            const codeAlerte  = genCodeAlerte(alerte.id, niveau)

            const cardOpacity = isAcquitted ? 'opacity-50' : ''

            return (
              <article
                key={alerte.id}
                className={[
                  'flex flex-col gap-0 relative transition-all duration-300 rounded-none',
                  cfg.borderLeft,
                  cfg.bg,
                  'border border-l-0 border-[#222]',
                  cardOpacity,
                ].join(' ')}
              >
                {/* ── CARD HEADER ──────────────────────────────────────── */}
                <header className="flex justify-between items-center px-4 pt-4 pb-3 border-b border-[#222]/60">
                  {/* Badge niveau */}
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => navigate(`/alertes/${alerte.id}`)}
                  >
                    <span className={`${cfg.badge} text-[10px] font-mono px-2 py-0.5 uppercase rounded-none`}>
                      {cfg.label}
                    </span>
                    {isAcquitted && (
                      <span className="border border-gray-600 text-gray-600 font-mono text-[10px] px-3 py-0.5 uppercase rounded-none">
                        ACQUITTÉE
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-gray-500 text-[10px] font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(alerte.timestamp)}
                  </span>
                </header>

                {/* ── CARD BODY ────────────────────────────────────────── */}
                <div className="flex flex-col gap-2 px-4 py-3">
                  {/* Code alerte */}
                  <div className={`${cfg.codeColor} font-mono text-xs mb-1`}>
                    # CODE_ALERTE : {codeAlerte}
                  </div>

                  {/* Message */}
                  <blockquote className="border-l-2 border-gray-600 pl-3 text-gray-300 font-mono text-xs leading-relaxed italic m-0">
                    {alerte.message}
                  </blockquote>

                  {/* Mini badges métriques (si dispo) */}
                  {(alerte.valeur_cpu != null || alerte.valeur_ram != null || alerte.valeur_bp != null) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {alerte.valeur_cpu != null && (
                        <span className="bg-transparent border border-gray-700 text-gray-400 text-[9px] font-mono px-1.5 py-0.5 rounded-none">
                          CPU: {alerte.valeur_cpu}%
                        </span>
                      )}
                      {alerte.valeur_ram != null && (
                        <span className="bg-transparent border border-gray-700 text-gray-400 text-[9px] font-mono px-1.5 py-0.5 rounded-none">
                          RAM: {alerte.valeur_ram}%
                        </span>
                      )}
                      {alerte.valeur_bp != null && (
                        <span className="bg-transparent border border-gray-700 text-gray-400 text-[9px] font-mono px-1.5 py-0.5 rounded-none">
                          BP: {alerte.valeur_bp} Mbps
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── CARD FOOTER ──────────────────────────────────────── */}
                <footer className="flex justify-between items-end px-4 pb-4 pt-3 border-t border-[#222]/40">
                  {/* SRC_IP / Noeud */}
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-600 text-[9px] font-mono uppercase mb-0.5">
                      SRC_IP // NOEUD CONCERNÉ
                    </span>
                    {alerte.equipement_id ? (
                      <span
                        onClick={() => navigate(`/inventaire/${alerte.equipement_id}`)}
                        className="bg-[#0a1a0a] border border-gray-600 text-cyan-300 font-mono text-xs px-2 py-1 rounded-none cursor-pointer hover:border-cyan-400 transition-colors w-max"
                      >
                        {alerte.equipement_ip || '???.???.???.???'} • NOEUD #{alerte.equipement_id}
                      </span>
                    ) : (
                      <span className="bg-[#0a1a0a] border border-gray-600 text-gray-500 font-mono text-xs px-2 py-1 rounded-none italic w-max">
                        N/A • NON DÉFINI
                      </span>
                    )}
                  </div>

                  {/* Bouton acquitter / badge */}
                  {!isAcquitted ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAcquitter(alerte.id) }}
                      disabled={isProcessing}
                      className={[
                        'border border-cyan-400 text-cyan-400 font-mono text-xs uppercase px-4 py-1.5 rounded-none',
                        'hover:bg-cyan-400 hover:text-black transition-all cursor-pointer',
                        'flex items-center gap-1.5 select-none',
                        isProcessing ? 'opacity-60 cursor-not-allowed' : '',
                      ].join(' ')}
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3 h-3 border border-current border-t-transparent animate-spin inline-block rounded-full" />
                          TRAITEMENT
                        </>
                      ) : (
                        <>✓ ACQUITTER</>
                      )}
                    </button>
                  ) : (
                    <span className="border border-gray-600 text-gray-600 font-mono text-[10px] px-3 py-1 cursor-default rounded-none uppercase">
                      ACQUITTÉE
                    </span>
                  )}
                </footer>
              </article>
            )
          })

        ) : (
          /* ── ÉTAT VIDE ────────────────────────────────────────────────── */
          <div className="border border-dashed border-gray-700 p-8 mt-6 font-mono rounded-none">
            <div className="text-gray-600 text-[10px] uppercase mb-4">
              // SYS_LIVE_FEED — QUEUE VIDE
            </div>
            <div className="text-cyan-500 text-sm">
              ✓ AUCUN INCIDENT ACTIF DÉTECTÉ
            </div>
            <div className="text-gray-600 text-xs mt-2">
              Isolation Forest : monitoring continu&nbsp;•&nbsp;WebSocket : connecté&nbsp;•&nbsp;Seuils : configurés
            </div>
            <div className="text-gray-700 text-[10px] mt-4">
              — En attente d&apos;événements réseau anormaux —
            </div>
          </div>
        )}
      </div>

      {/* ── PAGINATION (inchangée) ─────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-8 border-t border-[#222] pt-6 text-sm font-mono">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-[#222] text-gray-400 hover:text-cyan-400 hover:border-cyan-400 disabled:opacity-30 disabled:hover:border-[#222] transition-colors uppercase tracking-widest rounded-none"
          >
            PRÉCÉDENT
          </button>
          <span className="text-gray-500 tracking-widest">
            PAGE {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-[#222] text-gray-400 hover:text-cyan-400 hover:border-cyan-400 disabled:opacity-30 disabled:hover:border-[#222] transition-colors uppercase tracking-widest rounded-none"
          >
            SUIVANT
          </button>
        </div>
      )}
    </div>
  )
}
