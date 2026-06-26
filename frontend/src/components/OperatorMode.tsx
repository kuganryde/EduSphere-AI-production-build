import { useEffect } from 'react';
import { Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { AnalysisUpdate } from '../types';

interface OperatorModeProps {
  onSwitch: () => void;
  liveStats?: AnalysisUpdate | null;
  capacity?: number;
}

export default function OperatorMode({ onSwitch, liveStats, capacity = 35 }: OperatorModeProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'a') onSwitch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwitch]);

  const engagement = liveStats?.engagement ?? 0;
  const headcount = liveStats?.headcount ?? 0;
  const hasAlert = !!liveStats?.alert;
  const isLive = !!liveStats;

  const engColor = engagement > 79 ? 'text-green-500'
    : engagement > 49 ? 'text-amber-500' : 'text-red-500';

  const alertMessages: Record<string, string> = {
    high_distraction: 'High distraction detected — consider an interaction',
    low_attendance: 'Low attendance — below expected headcount',
    lecturer_absent: 'Lecturer not detected — supervision gap',
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 text-white bg-[#0b1120] relative min-h-0 w-full h-full">
      {/* Alert indicator */}
      {hasAlert && liveStats?.alert && (
        <div className="absolute top-4 md:top-6 right-4 md:right-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full z-10 shadow-lg max-w-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">{alertMessages[liveStats.alert] ?? 'Alert detected'}</span>
        </div>
      )}

      {/* No alert — show lecturer status */}
      {!hasAlert && liveStats?.lecturerPresent && (
        <div className="absolute top-4 md:top-6 right-4 md:right-6 flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-full z-10">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">Lecturer Present</span>
        </div>
      )}

      {/* Main engagement score */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isLive ? (
          <>
            <p className="text-xs text-gray-600 font-mono tracking-widest uppercase mb-2">Engagement Score</p>
            <h1 className={`text-8xl md:text-[11rem] font-bold leading-none tracking-tighter ${engColor}`}>
              {engagement}<span className="text-4xl md:text-6xl">%</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 font-mono tracking-widest uppercase mt-4 capitalize">
              {liveStats?.sentiment ?? 'Analysing...'}
            </p>
            {liveStats?.attentionRate !== null && liveStats?.attentionRate !== undefined && (
              <p className="text-sm text-gray-600 mt-2 font-mono">
                DeepFace attention: {liveStats.attentionRate}%
              </p>
            )}
          </>
        ) : (
          <>
            <div className="w-20 h-20 border-2 border-gray-700 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 font-mono text-sm uppercase tracking-widest text-center">
              No active source — connect a camera in Admin Mode
            </p>
          </>
        )}
        <p className="text-xs md:text-sm text-gray-600 mt-8 text-center bg-white/5 px-4 py-2 rounded-full border border-white/10">
          Press <kbd className="px-2 py-0.5 bg-white/10 rounded font-bold text-white shadow-sm border border-white/20 mx-1">A</kbd> to return to Admin Dashboard
        </p>
      </div>

      {/* Headcount bottom left */}
      <div className="absolute bottom-4 md:bottom-6 left-4 md:left-6 flex items-center gap-3 bg-[#121b2f] border border-white/5 p-3 md:p-4 rounded-2xl z-10 shadow-lg">
        <div className="bg-blue-500/10 p-2 md:p-3 rounded-xl border border-blue-500/20">
          <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Active Headcount</p>
          <p className="text-2xl md:text-3xl font-bold leading-none">
            {isLive ? headcount : '—'} <span className="text-sm md:text-base text-gray-600 font-medium">/ {capacity}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
