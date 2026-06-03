import { AlertOctagon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ServerErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-mono flex flex-col items-center justify-center p-4 crt-flicker relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{
             backgroundImage: 'linear-gradient(rgba(255, 78, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 78, 0, 0.1) 1px, transparent 1px)',
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="z-10 max-w-lg w-full cyber-card border-[#FF4E00] hover:border-[#FF4E00] text-center p-8 flex flex-col items-center gap-6 shadow-[0_0_15px_rgba(255,78,0,0.1)]">
        <div className="p-4 bg-[#FF4E00]/10 rounded-full mb-2 animate-pulse">
          <AlertOctagon className="w-12 h-12 text-[#FF4E00]" />
        </div>
        
        <div>
          <h1 className="text-4xl font-bold text-[#FF4E00] mb-2 tracking-widest">500</h1>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-4">Critical System Failure</h2>
          <p className="text-[#888] text-sm leading-relaxed mb-6">
            A fatal error occurred while processing the request. The mainframe is currently unresponsive or the connection was forcibly closed.
          </p>
        </div>

        <button 
          onClick={() => navigate(0)}
          className="cyber-button-critical cursor-blink"
        >
          RETRY_CONNECTION
        </button>
      </div>
    </div>
  );
}
