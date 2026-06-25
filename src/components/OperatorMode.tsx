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
    <div className="h-full flex flex-col p-6 text-white bg-[#0A0A0B] relative">
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-full animate-pulse">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-bold tracking-wider">ANOMALY DETECTED</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-[12rem] font-bold leading-none tracking-tighter text-green-500">85<span className="text-6xl">%</span></h1>
        <p className="text-2xl text-gray-500 font-mono tracking-widest uppercase mt-4">Average Engagement</p>
        <p className="text-sm text-gray-600 mt-8">Press <kbd className="px-2 py-1 bg-white/10 rounded mx-1">A</kbd> to return to Admin Dashboard</p>
      </div>

      <div className="absolute bottom-6 left-6 flex items-center gap-3 bg-[#161618] border border-white/5 p-4 rounded-2xl">
        <div className="bg-blue-500/10 p-3 rounded-xl">
          <Users className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">Active Headcount</p>
          <p className="text-3xl font-light">32 <span className="text-base text-gray-600">/ 35</span></p>
        </div>
      </div>
    </div>
  );
}
