/**
 * NodesActifsGauge — RadialBarChart nœuds UP / total
 * Thème projet : bg #0D0D0D, border #222, #00FFD1/#FFD700/#FF4E00
 */
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

const GREEN  = '#00FFD1'
const YELLOW = '#FFD700'
const RED    = '#FF4E00'

export default function NodesActifsGauge({ nodesUp = null, nodesTotal = 0, loading = false }) {
  const percent = nodesTotal > 0 && nodesUp !== null
    ? Math.round((nodesUp / nodesTotal) * 100)
    : null

  const color = percent === null ? '#333'
    : percent === 100 ? GREEN
    : percent >= 75   ? YELLOW
    : RED

  const chartVal = percent ?? 0

  return (
    <div className="cyber-card flex flex-col items-center h-full min-h-[190px]">
      <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500 mb-2 text-center">
        NŒUDS ACTIFS
      </span>

      <div className="relative flex-1 w-full flex items-center justify-center" style={{ minHeight: 130 }}>
        {loading && nodesUp === null ? (
          <div className="w-full h-[130px] bg-[#111] animate-pulse" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={130}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="55%" outerRadius="85%"
                startAngle={225} endAngle={-45}
                data={[{ value: chartVal, fill: color }]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: '#1A1A1A' }} dataKey="value" cornerRadius={0} clockWise />
              </RadialBarChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {nodesUp !== null ? (
                <>
                  <span className="text-2xl font-bold font-mono leading-none" style={{ color }}>
                    {nodesUp}
                    <span className="text-gray-600 text-base font-normal">/{nodesTotal || '?'}</span>
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono mt-1">ACTIFS</span>
                </>
              ) : (
                <span className="text-gray-600 font-mono animate-pulse">—/—</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-2 text-xs font-bold font-mono text-center" style={{ color }}>
        {percent !== null
          ? percent === 100 ? '● TOUS OPÉRATIONNELS' : `● ${100 - percent}% EN ERREUR`
          : '● EN ATTENTE'}
      </div>
    </div>
  )
}
