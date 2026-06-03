/**
 * AnomalieScore — AreaChart score Isolation Forest [-1, 1]
 * Thème projet : bg #0D0D0D, border #222, seuils #00FFD1/#FFD700/#FF4E00
 */
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts'

const CYAN      = '#00FFD1'
const RED       = '#FF4E00'
const YELLOW    = '#FFD700'
const GREEN     = '#00ff88'
const THRESHOLD = 0.5

function getScoreColor(score) {
  if (score === null || score === undefined) return '#555'
  if (score > THRESHOLD) return RED
  if (score > 0)         return YELLOW
  return GREEN
}

function getScoreLabel(score) {
  if (score === null || score === undefined) return 'N/A'
  if (score > THRESHOLD) return 'ANOMALIE'
  if (score > 0)         return 'SUSPECT'
  return 'NORMAL'
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.[0]) return null
  const score = payload[0].value
  const color = getScoreColor(score)
  return (
    <div className="bg-[#0D0D0D] border border-[#222] px-3 py-2 text-xs font-mono">
      <p className="text-gray-500 mb-1">{label}</p>
      <p style={{ color }}>Score: {score?.toFixed(4)}</p>
      <p style={{ color }} className="text-[10px]">[{getScoreLabel(score)}]</p>
    </div>
  )
}

export default function AnomalieScore({ history = [], loading = false, currentScore = null }) {
  const color = getScoreColor(currentScore)
  const label = getScoreLabel(currentScore)

  return (
    <div className="cyber-card flex flex-col h-full min-h-[220px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold">
          SCORE ANOMALIE IA (ISOLATION FOREST)
        </span>
        <div className="flex items-center gap-2">
          {currentScore !== null ? (
            <>
              <span
                className="text-[10px] font-mono px-2 py-0.5 border font-bold uppercase"
                style={{ color, borderColor: color, background: color + '18' }}
              >
                {label}
              </span>
              <span className="text-base font-bold font-mono" style={{ color }}>
                {currentScore.toFixed(3)}
              </span>
            </>
          ) : (
            <span className="text-[10px] font-mono text-gray-600 border border-[#222] px-2 py-0.5">N/A</span>
          )}
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
            <AreaChart data={history} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" strokeOpacity={0.5} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={{ stroke: '#222' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fill: '#555', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false} axisLine={false} width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={THRESHOLD} stroke={RED} strokeDasharray="4 4" strokeOpacity={0.7}
                label={{ value: 'SEUIL', position: 'insideTopRight', fill: RED, fontSize: 9, fontFamily: 'JetBrains Mono' }}
              />
              <ReferenceLine y={0} stroke="#333" strokeDasharray="2 2" strokeOpacity={0.5} />
              <Area
                type="monotone" dataKey="score"
                stroke={color} strokeWidth={2}
                fill="url(#anomGrad)" dot={false}
                activeDot={{ r: 4, fill: color }}
                animationDuration={300}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex gap-4 mt-2 text-[10px] font-mono text-gray-600">
        <span style={{ color: GREEN }}>■ NORMAL &lt;0</span>
        <span style={{ color: YELLOW }}>■ SUSPECT 0–0.5</span>
        <span style={{ color: RED }}>■ ANOMALIE &gt;0.5</span>
      </div>
    </div>
  )
}
