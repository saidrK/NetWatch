import { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toast, onRemove }) {
  const { message, type } = toast;

  let Icon = Info;
  let colors = 'border-[#222] bg-[#111] text-[#E0E0E0]';
  let iconColor = 'text-[#00FFD1]';

  switch (type) {
    case 'success':
      Icon = CheckCircle;
      colors = 'border-[#00FFD1] bg-[#111] text-[#E0E0E0] shadow-[0_0_8px_rgba(0,255,209,0.2)]';
      iconColor = 'text-[#00FFD1]';
      break;
    case 'error':
      Icon = AlertCircle;
      colors = 'border-[#FF4E00] bg-[#111] text-[#E0E0E0] shadow-[0_0_8px_rgba(255,78,0,0.2)]';
      iconColor = 'text-[#FF4E00]';
      break;
    case 'warning':
      Icon = AlertTriangle;
      colors = 'border-[#FFD700] bg-[#111] text-[#E0E0E0] shadow-[0_0_8px_rgba(255,215,0,0.2)]';
      iconColor = 'text-[#FFD700]';
      break;
    case 'info':
    default:
      Icon = Info;
      colors = 'border-[#222] bg-[#111] text-[#E0E0E0]';
      iconColor = 'text-[#00FFD1]';
      break;
  }

  return (
    <div
      className={`relative flex items-start gap-3 p-4 w-80 border font-mono animate-in slide-in-from-right-8 fade-in duration-300 ${colors}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-xs font-bold uppercase tracking-wider">{type}</span>
        <p className="text-xs text-gray-400">{message}</p>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 text-gray-500 hover:text-white transition-colors focus:outline-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
