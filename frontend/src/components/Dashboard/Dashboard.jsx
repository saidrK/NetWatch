/**
 * Dashboard.jsx — Mission Control v2 — Thème projet
 * Thème : #050505 bg | #0D0D0D/#111 cards | #222 borders
 *         #00FFD1 cyan | #FFD700 warning | #FF4E00 critical
 */
import { useEffect, useState, useCallback } from 'react'
import { useWebSocket }  from '@/hooks/useWebSocket'
import { alertesAPI }    from '@/services/api'

import WebSocketIndicateur from './WebSocketIndicateur'
import JaugeCirculaire     from './JaugeCirculaire'
import BandePassanteChart  from './BandePassanteChart'
import AnomalieScore       from './AnomalieScore'
import LatenceChart        from './LatenceChart'
import NodesActifsGauge    from './NodesActifsGauge'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

import { Activity, AlertTriangle, Network, Server, Cpu, HardDrive } from 'lucide-react'

const CYAN   = '#00FFD1'
const RED    = '#FF4E00'
const YELLOW = '#FFD700'
const HISTORY_MAX = 40

function shortTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
  } catch { return '--:--' }
}

function aggregateNodes(nodes) {
  if (!nodes?.length) return null
  const active = nodes.filter(n => ['actif','UP','EN_LIGNE'].includes(n.statut))
  const avg = (key) => nodes.reduce((s, n) => s + (n[key] ?? 0), 0) / nodes.length
  return {
    cpu_percent:   avg('cpu_percent'),
    ram_percent:   avg('ram_percent'),
    bytes_sent:    nodes.reduce((s, n) => s + (n.bytes_sent ?? 0), 0),
    bytes_recv:    nodes.reduce((s, n) => s + (n.bytes_recv ?? 0), 0),
    latency_ms:    avg('latency_ms'),
    packet_loss:   avg('packet_loss'),
    anomaly_score: avg('anomaly_score'),
    nodes_up:      active.length,
    nodes_total:   nodes.length,
    nodes,
  }
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({ label, value, unit, icon: Icon, accent = CYAN, state = 'ok', sub }) {
  const border = state === 'critical' ? RED : state === 'warning' ? YELLOW : accent
  return (
    <div
      className="bg-[#0D0D0D] border p-6 flex flex-col gap-3 hover:border-[#00FFD1] transition-colors duration-150"
      style={{ borderColor: border }}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono uppercase tracking-widest text-gray-500" style={{ fontSize: 11 }}>{label}</span>
        <Icon style={{ color: border, width: 20, height: 20 }} />
      </div>
      <div className="flex items-end gap-2">
        <span className="font-bold font-mono leading-none" style={{ color: border, fontSize: 48 }}>
          {value !== null && value !== undefined ? value : '—'}
        </span>
        {unit && <span className="font-mono" style={{ color: '#4b5563', fontSize: 15, marginBottom: 4 }}>{unit}</span>}
      </div>
      {sub && <span className="font-mono" style={{ color: '#4b5563', fontSize: 11 }}>{sub}</span>}
    </div>
  )
}

// ── Mini AreaChart (CPU / RAM) ────────────────────────────────
function MiniAreaChart({ data = [], dataKey, color = CYAN, loading = false }) {
  if (loading && data.length === 0)
    return <div className="w-full h-full bg-[#111] animate-pulse" />
  if (data.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-gray-600 font-mono" style={{ fontSize: 13 }}>
        <span className="animate-pulse">En attente de données...</span>
      </div>
    )
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`miniGrad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" strokeOpacity={0.8} />
        <XAxis dataKey="time" hide />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          contentStyle={{ background: '#0D0D0D', border: '1px solid #222', fontFamily: 'JetBrains Mono', fontSize: 11 }}
          labelStyle={{ color: '#555' }}
          itemStyle={{ color }}
          formatter={v => [`${v?.toFixed(1)}%`, dataKey.toUpperCase()]}
        />
        <Area
          type="monotone" dataKey={dataKey}
          stroke={color} strokeWidth={2}
          fill={`url(#miniGrad-${dataKey})`}
          dot={false} activeDot={{ r: 3, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { data: wsData, connected, error } = useWebSocket()

  const [current,       setCurrent]       = useState(null)
  const [lastUpdate,    setLastUpdate]    = useState(null)
  const [alertesCount,  setAlertesCount]  = useState(null)
  const [wsLoading,     setWsLoading]     = useState(true)
  const [nodes,         setNodes]         = useState([])

  const [cpuHistory,      setCpuHistory]      = useState([])
  const [ramHistory,      setRamHistory]      = useState([])
  const [bpHistory,       setBpHistory]       = useState([])
  const [latenceHistory,  setLatenceHistory]  = useState([])
  const [anomalieHistory, setAnomalieHistory] = useState([])

  useEffect(() => {
    if (!wsData) return
    const ts    = wsData.timestamp || new Date().toISOString()
    const label = shortTime(ts)
    setLastUpdate(ts)
    setWsLoading(false)
    if (wsData.alertes_actives !== undefined) setAlertesCount(wsData.alertes_actives)

    const rawNodes = wsData.nodes || []
    setNodes(rawNodes)
    const agg = aggregateNodes(rawNodes)
    if (!agg) return
    setCurrent(agg)

    const push = (setter, point) =>
      setter(prev => [...prev.slice(-(HISTORY_MAX - 1)), point])

    push(setCpuHistory,      { time: label, cpu: +agg.cpu_percent.toFixed(1) })
    push(setRamHistory,      { time: label, ram: +agg.ram_percent.toFixed(1) })
    push(setBpHistory,       { time: label, sent: agg.bytes_sent, recv: agg.bytes_recv })
    push(setLatenceHistory,  { time: label, latence: +agg.latency_ms.toFixed(2), perte: +agg.packet_loss.toFixed(2) })
    push(setAnomalieHistory, { time: label, score: +agg.anomaly_score.toFixed(4) })
  }, [wsData])

  const fetchAlertes = useCallback(async () => {
    try {
      const res   = await alertesAPI.lister({ acquittee: false, limite: 1 })
      const total = res.data?.total ?? res.data?.length ?? null
      if (total !== null) setAlertesCount(total)
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => {
    fetchAlertes()
    const id = setInterval(fetchAlertes, 60_000)
    return () => clearInterval(id)
  }, [fetchAlertes])

  const cpuState  = !current ? 'ok' : current.cpu_percent >= 90 ? 'critical' : current.cpu_percent >= 75 ? 'warning' : 'ok'
  const ramState  = !current ? 'ok' : current.ram_percent >= 90 ? 'critical' : current.ram_percent >= 75 ? 'warning' : 'ok'
  const alertState= alertesCount > 5 ? 'critical' : alertesCount > 0 ? 'warning' : 'ok'
  const nodesDown = current ? current.nodes_total - current.nodes_up : 0

  return (
    <div className="flex flex-col gap-8 p-6 crt-flicker">

      {/* ══ HEADER ══════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#222] pb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase font-mono mb-1 flex items-center gap-3">
            MISSION_CONTROL
            <span className="text-xs text-gray-600 border border-[#222] px-2 py-0.5 font-normal">v2.0</span>
          </h2>
          <p className="text-xs text-[#888] font-mono uppercase tracking-wider">
            Plateforme Intelligente de Supervision Réseau • FSBM Hassan II, Casablanca
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="flex items-center gap-2 border px-4 py-2 font-mono"
            style={{
              borderColor: alertesCount > 0 ? RED : '#222',
              color:       alertesCount > 0 ? RED : '#555',
              background:  alertesCount > 0 ? RED + '15' : 'transparent',
            }}
          >
            <div className="flex items-center gap-2">
            <AlertTriangle style={{ width: 16, height: 16 }} />
            <span className="font-bold" style={{ fontSize: 14 }}>
              {alertesCount !== null ? alertesCount : '—'} ALERTE{alertesCount !== 1 ? 'S' : ''}
            </span>
            {alertesCount > 0 && <span style={{ fontSize: 10, opacity: 0.7 }}>NON ACQ.</span>}
            </div>
          </div>
          <WebSocketIndicateur connected={connected} error={error} lastUpdate={lastUpdate} />
        </div>
      </div>

      {/* ══ ROW 1 : 4 KPI CARDS ═════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="CPU Moyen" icon={Cpu}
          value={current ? `${current.cpu_percent.toFixed(1)}` : null} unit="%"
          accent={CYAN} state={cpuState}
          sub={cpuState === 'critical' ? '⚠ CHARGE CRITIQUE' : cpuState === 'warning' ? '⚠ CHARGE ÉLEVÉE' : '● NORMAL'}
        />
        <KpiCard
          label="RAM Moyenne" icon={HardDrive}
          value={current ? `${current.ram_percent.toFixed(1)}` : null} unit="%"
          accent={CYAN} state={ramState}
          sub={ramState === 'critical' ? '⚠ SATURATION' : ramState === 'warning' ? '⚠ ÉLEVÉE' : '● NORMAL'}
        />
        <KpiCard
          label="Nœuds Actifs" icon={Server}
          value={current ? `${current.nodes_up}/${current.nodes_total}` : null} unit="UP"
          accent={nodesDown > 0 ? RED : CYAN}
          state={nodesDown > 0 ? 'critical' : 'ok'}
          sub={current
            ? nodesDown === 0 ? '● TOUS OPÉRATIONNELS' : `⚠ ${nodesDown} EN ERREUR`
            : '● EN ATTENTE'}
        />
        <KpiCard
          label="Alertes Actives" icon={AlertTriangle}
          value={alertesCount !== null ? alertesCount : null} unit="ALERTES"
          accent={alertesCount > 0 ? RED : CYAN}
          state={alertState}
          sub={alertesCount > 0 ? '⚠ INTERVENTION REQUISE' : '● SYSTÈME OK'}
        />
      </div>

      {/* ══ ROW 2 : JAUGES (label intégré dans card) ════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="cyber-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="font-mono uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2" style={{ fontSize: 12 }}>
              <Cpu style={{ width: 16, height: 16, color: CYAN }} />
              CPU USAGE
            </span>
            <span className="font-mono font-bold" style={{ color: CYAN, fontSize: 15 }}>
              {current ? `${current.cpu_percent.toFixed(1)}%` : '—'}
            </span>
          </div>
          <JaugeCirculaire
            value={current?.cpu_percent ?? null}
            label="CPU Moyen (tous nœuds)"
            loading={wsLoading}
          />
        </div>

        <div className="cyber-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="font-mono uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2" style={{ fontSize: 12 }}>
              <HardDrive style={{ width: 16, height: 16, color: YELLOW }} />
              RAM USAGE
            </span>
            <span className="font-mono font-bold" style={{ color: YELLOW, fontSize: 15 }}>
              {current ? `${current.ram_percent.toFixed(1)}%` : '—'}
            </span>
          </div>
          <JaugeCirculaire
            value={current?.ram_percent ?? null}
            label="RAM Moyenne (tous nœuds)"
            loading={wsLoading}
          />
        </div>

        <div className="cyber-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="font-mono uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2" style={{ fontSize: 12 }}>
              <Server style={{ width: 16, height: 16, color: CYAN }} />
              DISPONIBILITÉ RÉSEAU
            </span>
            <span className="font-mono font-bold" style={{ color: nodesDown > 0 ? RED : CYAN, fontSize: 15 }}>
              {current ? `${current.nodes_up}/${current.nodes_total}` : '—'}
            </span>
          </div>
          <NodesActifsGauge
            nodesUp={current?.nodes_up ?? null}
            nodesTotal={current?.nodes_total ?? 0}
            loading={wsLoading}
          />
        </div>
      </div>

      {/* ══ ROW 3 : CPU + RAM séries temporelles ════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="cyber-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="font-mono uppercase tracking-widest text-gray-400 font-bold" style={{ fontSize: 12 }}>
              CPU % — ÉVOLUTION TEMPS RÉEL
            </span>
            <span className="font-bold font-mono" style={{ color: CYAN, fontSize: 15 }}>
              {current ? `${current.cpu_percent.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div style={{ height: 180 }}>
            <MiniAreaChart data={cpuHistory} dataKey="cpu" color={CYAN} loading={wsLoading} />
          </div>
        </div>

        <div className="cyber-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="font-mono uppercase tracking-widest text-gray-400 font-bold" style={{ fontSize: 12 }}>
              RAM % — ÉVOLUTION TEMPS RÉEL
            </span>
            <span className="font-bold font-mono" style={{ color: YELLOW, fontSize: 15 }}>
              {current ? `${current.ram_percent.toFixed(1)}%` : '—'}
            </span>
          </div>
          <div style={{ height: 180 }}>
            <MiniAreaChart data={ramHistory} dataKey="ram" color={YELLOW} loading={wsLoading} />
          </div>
        </div>
      </div>

      {/* ══ ROW 4 : BANDE PASSANTE + LATENCE ════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BandePassanteChart history={bpHistory}      loading={wsLoading} />
        <LatenceChart       history={latenceHistory} loading={wsLoading} />
      </div>

      {/* ══ ROW 5 : ANOMALIE IA + TABLE NŒUDS ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Score anomalie — 3 col */}
        <div className="lg:col-span-3">
          <AnomalieScore
            history={anomalieHistory}
            currentScore={current?.anomaly_score ?? null}
            loading={wsLoading}
          />
        </div>

        {/* Table nœuds — 2 col */}
        <div className="lg:col-span-2 cyber-card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <span className="font-mono uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2" style={{ fontSize: 12 }}>
              <Network style={{ width: 16, height: 16, color: CYAN }} />
              INVENTAIRE NŒUDS
            </span>
            <span className="font-mono" style={{ color: '#4b5563', fontSize: 11 }}>
              {nodes.length} SUPERVISÉ{nodes.length !== 1 ? 'S' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 240 }}>
            {nodes.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-gray-600 font-mono animate-pulse" style={{ fontSize: 13 }}>
                En attente de données...
              </div>
            ) : nodes.map((n, i) => {
              const isUp      = ['actif','UP','EN_LIGNE'].includes(n.statut)
              const nodeColor = isUp ? CYAN : RED
              return (
                <div
                  key={n.id || i}
                  className="flex items-center justify-between border border-[#222] px-4 py-3 hover:border-[#00FFD1] transition-colors duration-150"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono font-bold text-white truncate max-w-[140px]" style={{ fontSize: 14 }}>
                      {n.nom || n.hostname || n.ip || `NODE-${n.id}`}
                    </span>
                    <span className="font-mono" style={{ color: '#4b5563', fontSize: 11 }}>{n.ip || n.adresse_ip || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {n.cpu_percent !== undefined && (
                      <span className="font-mono" style={{ color: '#6b7280', fontSize: 12 }}>
                        CPU {n.cpu_percent.toFixed(0)}%
                      </span>
                    )}
                    <span
                      className="font-bold font-mono border px-2 py-0.5"
                      style={{ color: nodeColor, borderColor: nodeColor, background: nodeColor + '15', fontSize: 11 }}
                    >
                      {isUp ? 'UP' : 'DOWN'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer IA */}
          <div className="border-t border-[#222] pt-3 flex items-center justify-between font-mono" style={{ fontSize: 11 }}>
            <span className="flex items-center gap-2" style={{ color: YELLOW }}>
              <Activity style={{ width: 14, height: 14 }} />
              ISOLATION FOREST: ACTIF
            </span>
            <span style={{ color: '#4b5563' }}>
              Score moy.: {current ? current.anomaly_score.toFixed(3) : '—'}
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}
