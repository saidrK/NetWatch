import { Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-mono flex flex-col items-center justify-center p-4 crt-flicker relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{
             backgroundImage: 'linear-gradient(rgba(0, 255, 209, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 209, 0.1) 1px, transparent 1px)',
             backgroundSize: '30px 30px'
           }}>
      </div>

      <div className="z-10 max-w-lg w-full cyber-card border-[#FFD700] hover:border-[#FFD700] text-center p-8 flex flex-col items-center gap-6 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
        <div className="p-4 bg-[#FFD700]/10 rounded-full mb-2">
          <Terminal className="w-12 h-12 text-[#FFD700]" />
        </div>
        
        <div>
          <h1 className="text-4xl font-bold text-[#FFD700] mb-2 tracking-widest">404</h1>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-4">Target Not Found</h2>
          <p className="text-[#888] text-sm leading-relaxed mb-6">
            The requested sector does not exist in the current grid. Please verify your coordinates or return to the main console.
          </p>
        </div>

        <button 
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-[#FFD700]/10 border border-[#FFD700] text-[#FFD700] hover:bg-[#FFD700]/20 hover:shadow-[0_0_10px_rgba(255,215,0,0.4)] transition-all uppercase font-bold tracking-widest text-xs cursor-blink"
        >
          RETURN_TO_MAIN
        </button>
      </div>
    </div>
  );
}
