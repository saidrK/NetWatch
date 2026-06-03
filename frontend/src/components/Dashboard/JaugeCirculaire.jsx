/**
 * JaugeCirculaire — RadialBarChart Recharts
 * Thème projet : bg #0D0D0D, border #222, accent #00FFD1
 */
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'

function getColor(value) {
  if (value === null || value === undefined) return '#333'
  if (value >= 90) return '#FF4E00'
  if (value >= 75) return '#FFD700'
  return '#00FFD1'
}

export default function JaugeCirculaire({ value, label, unit = '%', loading = false }) {
  const color        = getColor(value)
  const displayValue = value !== null && value !== undefined ? Math.round(value) : null
  const chartValue   = displayValue ?? 0

  return (
    <div className="flex flex-col items-center bg-[#0D0D0D] border border-[#222] p-4 h-full min-h-[190px] hover:border-[#00FFD1] transition-colors duration-150">
      <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500 mb-2 text-center">{label}</span>

      <div className="relative flex-1 w-full flex items-center justify-center" style={{ minHeight: 130 }}>
        {loading && displayValue === null ? (
          <div className="w-full h-[130px] bg-[#111] animate-pulse" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={130}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="60%" outerRadius="90%"
                startAngle={225} endAngle={-45}
                data={[{ value: chartValue, fill: color }]}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: '#1A1A1A' }} dataKey="value" cornerRadius={0} clockWise />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Valeur centre */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {displayValue !== null ? (
                <>
                  <span className="text-3xl font-bold font-mono leading-none" style={{ color }}>
                    {displayValue}
                  </span>
                  <span className="text-xs text-gray-600 font-mono mt-1">{unit}</span>
                </>
              ) : (
                <span className="text-gray-600 text-base font-mono animate-pulse">—</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Légende seuils */}
      <div className="flex gap-3 mt-2 text-[9px] font-mono text-gray-600">
        <span style={{ color: '#00FFD1' }}>■ OK&lt;75</span>
        <span style={{ color: '#FFD700' }}>■ WARN&lt;90</span>
        <span style={{ color: '#FF4E00' }}>■ CRIT≥90</span>
      </div>
    </div>
  )
}
