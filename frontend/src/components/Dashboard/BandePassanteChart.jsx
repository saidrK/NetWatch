/**
 * BandePassanteChart — Double AreaChart bytes_sent / bytes_recv
 * Thème projet : bg #0D0D0D, border #222, accent #00FFD1/#00ff88
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const CYAN  = '#00FFD1'
const GREEN = '#00ff88'

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—'
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(2)} MB/s` : `${(bytes / 1024).toFixed(1)} KB/s`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0D0D0D] border border-[#222] px-3 py-2 text-xs font-mono">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatBytes((p.value ?? 0) * 1024 * 1024)}
        </p>
      ))}
    </div>
  )
}

export default function BandePassanteChart({ history = [], loading = false }) {
  const chartData = history.map(p => ({
    time:        p.time,
    'IN (MB/s)': p.recv !== undefined ? +(p.recv / (1024 * 1024)).toFixed(3) : 0,
    'OUT (MB/s)':p.sent !== undefined ? +(p.sent / (1024 * 1024)).toFixed(3) : 0,
  }))

  return (
    <div className="cyber-card flex flex-col h-full min-h-[220px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">
          BANDE PASSANTE RÉSEAU
        </span>
        <div className="flex gap-4 text-xs font-mono font-bold">
          <span style={{ color: GREEN }}>■ IN</span>
          <span style={{ color: CYAN }}>■ OUT</span>
        </div>
      </div>

      <div className="flex-1" style={{ minHeight: 160 }}>
        {loading && history.length === 0 ? (
          <div className="w-full h-full bg-[#111] animate-pulse" />
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm font-mono">
            <span className="animate-pulse">En attente de données...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bpGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={GREEN} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="bpGradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CYAN}  stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CYAN}  stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#555', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={{ stroke: '#222' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#555', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v}M`} width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="IN (MB/s)"  stroke={GREEN} strokeWidth={2} fill="url(#bpGradGreen)" dot={false} activeDot={{ r: 3, fill: GREEN }} />
              <Area type="monotone" dataKey="OUT (MB/s)" stroke={CYAN}  strokeWidth={2} fill="url(#bpGradCyan)"  dot={false} activeDot={{ r: 3, fill: CYAN  }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
