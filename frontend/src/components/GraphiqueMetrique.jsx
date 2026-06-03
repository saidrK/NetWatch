import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const GraphiqueMetrique = ({
  data,
  metricKey,
  label,
  color = '#00FFD1',
  glowColor = 'rgba(0, 255, 209, 0.2)'
}) => {
  return (
    <div className="cyber-card flex flex-col gap-3 w-full">
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <h3 className="text-xs font-bold font-mono text-white uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2" style={{ backgroundColor: color }} />
          {label}
        </h3>
        <span className="text-[9px] font-mono text-[#444] uppercase tracking-widest">INFLUXDB_PULL</span>
      </div>

      <div className="w-full h-44 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id={`color-${metricKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#222"
              tick={{ fill: '#444', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#222' }}
            />
            <YAxis 
              stroke="#222"
              tick={{ fill: '#444', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
              axisLine={{ stroke: '#222' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#050505',
                border: '1px solid #222',
                borderRadius: '0px',
                fontFamily: 'JetBrains Mono',
                fontSize: '11px'
              }}
              labelStyle={{ color: '#888', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey={metricKey} 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#color-${metricKey})`}
              strokeWidth={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center font-mono text-[9px] text-[#444]">
        <span>T-60MIN</span>
        <span>MÉTRIQUE: {metricKey.toUpperCase()}</span>
        <span>LIVE_TS</span>
      </div>
    </div>
  );
};
