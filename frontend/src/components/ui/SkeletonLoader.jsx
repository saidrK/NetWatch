import { Loader2 } from 'lucide-react';

export default function SkeletonLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full text-[#00FFD1] gap-4 font-mono">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 border border-[#00FFD1] rounded-full animate-ping opacity-20"></div>
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs uppercase tracking-[0.3em] font-bold">Chargement du Module</span>
        <div className="h-1 w-24 bg-[#111] overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full bg-[#00FFD1] w-1/3 animate-[slide_1s_ease-in-out_infinite]" />
        </div>
      </div>
      <style>{`
        @keyframes slide {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
