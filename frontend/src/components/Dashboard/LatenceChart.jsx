/**
 * LatenceChart — LineChart dual-axis latence ms / perte paquets %
 * Thème projet : bg #0D0D0D, border #222, #00FFD1 / #FF4E00
 */
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'

const CYAN   = '#00FFD1'
const ORANGE = '#FF4E00'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0D0D0D] border border-[#222] px-3 py-2 text-xs font-mono">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(2)} {p.dataKey === 'latence' ? 'ms' : '%'}
        </p>
      ))}
    </div>
  )
}

export default function LatenceChart({ history = [], loading = false }) {
  return (
    <div className="cyber-card flex flex-col h-full min-h-[220px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">
          LATENCE &amp; PERTE DE PAQUETS
        </span>
        <div className="flex gap-3 text-[10px] font-mono">
          <span style={{ color: CYAN }}>■ Latence (ms)</span>
          <span style={{ color: ORANGE }}>■ Perte (%)</span>
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
            <LineChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={{ stroke: '#222' }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={false}
                width={36} tickFormatter={v => `${v}ms`}
              />
              <YAxis
                yAxisId="right" orientation="right"
                domain={[0, 100]}
                tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={false}
                width={28} tickFormatter={v => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                yAxisId="left" type="monotone" dataKey="latence" name="Latence"
                stroke={CYAN} strokeWidth={2} dot={false}
                activeDot={{ r: 3, fill: CYAN }}
              />
              <Line
                yAxisId="right" type="monotone" dataKey="perte" name="Perte"
                stroke={ORANGE} strokeWidth={2} dot={false}
                activeDot={{ r: 3, fill: ORANGE }} strokeDasharray="4 2"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
