import { useEffect } from 'react';
import { Users, AlertTriangle } from 'lucide-react';

export default function OperatorMode({ onSwitch }: { onSwitch: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a') {
        onSwitch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwitch]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 text-white bg-[#0b1120] relative min-h-0 w-full">
      <div className="absolute top-4 md:top-6 right-4 md:right-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1.5 md:px-4 md:py-2 rounded-full animate-pulse z-10 shadow-lg">
        <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
        <span className="text-xs md:text-sm font-bold tracking-wider">ANOMALY DETECTED</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-8xl md:text-[12rem] font-bold leading-none tracking-tighter text-green-500">85<span className="text-4xl md:text-6xl">%</span></h1>
        <p className="text-lg md:text-2xl text-gray-500 font-mono tracking-widest uppercase mt-4 text-center">Average Engagement</p>
        <p className="text-xs md:text-sm text-gray-600 mt-8 text-center bg-white/5 px-4 py-2 rounded-full border border-white/10">Press <kbd className="px-2 py-0.5 bg-white/10 rounded font-bold text-white shadow-sm border border-white/20 mx-1">A</kbd> to return to Admin Dashboard</p>
      </div>

      <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 flex items-center gap-3 bg-[#121b2f] border border-white/5 p-3 md:p-4 rounded-2xl z-10 shadow-lg">
        <div className="bg-blue-500/10 p-2 md:p-3 rounded-xl border border-blue-500/20">
          <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Active Headcount</p>
          <p className="text-2xl md:text-3xl font-bold leading-none">32 <span className="text-sm md:text-base text-gray-600 font-medium">/ 35</span></p>
        </div>
      </div>
    </div>
  );
}
