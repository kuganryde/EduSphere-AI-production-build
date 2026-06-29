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
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'a') onSwitch(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSwitch]);

  const engagement = liveStats?.engagement ?? 0;
  const headcount  = liveStats?.headcount  ?? 0;
  const hasAlert   = !!liveStats?.alert;
  const isLive     = !!liveStats;

  const engColor = engagement > 79 ? '#10b981' : engagement > 49 ? '#f59e0b' : '#ef4444';

  const alertMessages: Record<string, string> = {
    high_distraction: 'High distraction detected — consider an interaction',
    low_attendance:   'Low attendance — below expected headcount',
    lecturer_absent:  'Lecturer not detected — supervision gap',
  };

  return (
    <div
      className="flex-1 flex flex-col p-4 md:p-6 relative min-h-0 w-full h-full transition-theme"
      style={{ background: 'var(--surface-0)', color: 'var(--text-0)' }}
    >
      {/* Alert indicator */}
      {hasAlert && liveStats?.alert && (
        <div
          className="absolute top-4 md:top-6 right-4 md:right-6 flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full z-10 shadow-lg max-w-xs"
          style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">{alertMessages[liveStats.alert] ?? 'Alert detected'}</span>
        </div>
      )}

      {/* Lecturer present indicator */}
      {!hasAlert && liveStats?.lecturerPresent && (
        <div
          className="absolute top-4 md:top-6 right-4 md:right-6 flex items-center gap-2 px-3 py-1.5 rounded-full z-10"
          style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', color: 'var(--success)' }}
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">Lecturer Present</span>
        </div>
      )}

      {/* Main score */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isLive ? (
          <>
            <p className="text-xs font-mono tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>
              Engagement Score
            </p>
            <h1
              className="text-8xl md:text-[11rem] font-bold leading-none tracking-tighter score-glow"
              style={{ color: engColor }}
            >
              {engagement}<span className="text-4xl md:text-6xl">%</span>
            </h1>
            <p className="text-lg md:text-xl font-mono tracking-widest uppercase mt-4 capitalize" style={{ color: 'var(--text-2)' }}>
              {liveStats?.sentiment ?? 'Analysing…'}
            </p>
            {liveStats?.attentionRate != null && (
              <p className="text-sm mt-2 font-mono" style={{ color: 'var(--text-3)' }}>
                DeepFace attention: {liveStats.attentionRate}%
              </p>
            )}
          </>
        ) : (
          <>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
              style={{ border: '2px solid var(--border-1)' }}
            >
              <svg className="w-10 h-10" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-mono text-sm uppercase tracking-widest text-center" style={{ color: 'var(--text-3)' }}>
              No active source — connect a camera in Admin Mode
            </p>
          </>
        )}
        <p
          className="text-xs md:text-sm mt-8 text-center px-4 py-2 rounded-full"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-2)' }}
        >
          Press{' '}
          <kbd
            className="px-2 py-0.5 rounded font-bold mx-1"
            style={{ background: 'var(--surface-4)', border: '1px solid var(--border-2)', color: 'var(--text-0)' }}
          >
            A
          </kbd>
          {' '}to return to Admin Dashboard
        </p>
      </div>

      {/* Headcount bottom-left */}
      <div
        className="absolute bottom-4 md:bottom-6 left-4 md:left-6 flex items-center gap-3 p-3 md:p-4 rounded-2xl z-10"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-md)' }}
      >
        <div
          className="p-2 md:p-3 rounded-xl"
          style={{ background: 'var(--brand-dim)', border: '1px solid rgba(59,130,246,0.25)' }}
        >
          <Users className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--brand)' }} />
        </div>
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
            Active Headcount
          </p>
          <p className="text-2xl md:text-3xl font-bold leading-none" style={{ color: 'var(--text-0)' }}>
            {isLive ? headcount : '—'}
            <span className="text-sm md:text-base font-medium ml-1" style={{ color: 'var(--text-3)' }}>
              / {capacity}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
