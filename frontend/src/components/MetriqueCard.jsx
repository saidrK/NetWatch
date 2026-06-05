import { ArrowUpRight } from 'lucide-react';

export const MetriqueCard = ({
  titre,
  valeur,
  unite,
  statusBadge,
  statusColor = 'cyan',
  trendValue,
  isPositiveTrend = true,
  sparklineData = [10, 15, 8, 25, 18, 30],
  state = 'OK'
}) => {
  const getStateColor = () => {
    switch (state) {
      case 'WARNING':
        return '#FFD700'; // yellow
      case 'CRITICAL':
        return '#FF4444'; // red
      default: // OK
        return '#00FFD1'; // cyan
    }
  };

  const stateColor = getStateColor();

  const getBadgeStyles = () => {
    // Badge: rectangle avec border + texte coloré (pas rempli), font monospace uppercase, text-xs
    return `border text-[10px] font-mono uppercase px-1`;
  };

  const getBadgeColorClass = () => {
    switch (state) {
      case 'WARNING':
        return 'border-[#FFD700] text-[#FFD700]';
      case 'CRITICAL':
        return 'border-[#FF4444] text-[#FF4444]';
      default: // OK
        return 'border-[#00FFD1] text-[#00FFD1]';
    }
  };

  const getSparklineColor = () => {
    switch (state) {
      case 'WARNING':
        return 'bg-[#FFD700] shadow-[0_0_4px_rgba(255,215,0,0.5)]';
      case 'CRITICAL':
        return 'bg-[#FF4444] shadow-[0_0_4px_rgba(255,68,68,0.5)]';
      default: // OK
        return 'bg-[#00FFD1] shadow-[0_0_4px_rgba(0,255,209,0.5)]';
    }
  };

  const getTrendColorClass = () => {
    switch (state) {
      case 'WARNING':
        return 'text-[#FFD700]';
      case 'CRITICAL':
        return 'text-[#FF4444]';
      default: // OK
        return 'text-[#00FFD1]';
    }
  };

  return (
    <div className="cyber-card relative flex flex-col justify-between group h-full">
      {statusBadge && (
        <div className={`absolute top-3 right-3 ${getBadgeStyles()} ${getBadgeColorClass()}`}>
          {statusBadge}
        </div>
      )}

      <div>
        <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest font-mono select-none block mb-2">
          {titre}
        </span>
        <div className="flex items-baseline gap-1 select-all font-mono">
          <span className="text-3xl font-light text-white leading-none">
            {valeur}
          </span>
          {unite && <span className="text-xs font-normal text-[#555] ml-1 uppercase">{unite}</span>}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1 w-full font-mono">
        <div className="flex justify-between items-center text-[9px] text-[#444] uppercase">
          <span>TIME-SERIES</span>
          {trendValue && (
            <span className={`flex items-center gap-0.5 font-bold ${getTrendColorClass()}`}>
              <ArrowUpRight className="w-3 h-3" />
              {trendValue}
            </span>
          )}
        </div>

        {/* Dynamic sparkline rendering */}
        <div className="h-6 flex items-end gap-[1.5px] mt-1.5 opacity-80">
          {sparklineData.map((val, idx) => {
            const maxVal = Math.max(...sparklineData, 1);
            const percentage = Math.min(100, Math.max(10, (val / maxVal) * 100));
            
            const barBg = getSparklineColor();

            return (
              <div
                key={idx}
                style={{ height: `${percentage}%` }}
                className={`flex-1 transition-all duration-300 ${barBg}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
