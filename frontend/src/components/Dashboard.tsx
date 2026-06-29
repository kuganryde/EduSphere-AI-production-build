import { useState, useCallback } from 'react';
import RoomCard from './RoomCard';
import AlertBanner from './AlertBanner';
import AlertLog from './AlertLog';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';
import { Session, AnalysisUpdate, PedagogicalAnalysis } from '../types';

const ROOM_ID = 'room-402-b';
const ROOM_NAME = 'Room 402-B / Main Stage';
const ROOM_CAPACITY = 34;
const MAX_HISTORY = 50;

interface BannerAlert { id: string; message: string; level: 1 | 2 | 3 }

const ALERT_MESSAGES: Record<string, string> = {
  high_distraction: 'High distraction detected — class may need re-engagement',
  low_attendance: 'Low attendance — headcount below expected capacity',
  lecturer_absent: 'Lecturer not visible — supervision gap detected',
};

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface DashboardProps {
  onLiveStats?: (update: AnalysisUpdate) => void;
}

export default function Dashboard({ onLiveStats }: DashboardProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<Omit<AnalysisUpdate, 'timestamp'>>({
    engagement: 0, headcount: 0, sentiment: 'Awaiting...', lecturerPresent: false,
    gestures: null, alert: null, attentionRate: null,
  });
  const [engagementHistory, setEngagementHistory] = useState<{ time: string; focus: number; attention: number }[]>([]);
  const [lastGestures, setLastGestures] = useState<PedagogicalAnalysis['gestures'] | null>(null);
  const [bannerAlerts, setBannerAlerts] = useState<BannerAlert[]>([
    { id: 'init', message: 'Select a camera source to begin live monitoring', level: 1 },
  ]);

  const dismissAlert = (id: string) => setBannerAlerts(a => a.filter(x => x.id !== id));

  const handleStatsUpdate = useCallback((update: AnalysisUpdate) => {
    setStats({ engagement: update.engagement, headcount: update.headcount, sentiment: update.sentiment, lecturerPresent: update.lecturerPresent, gestures: update.gestures, alert: update.alert, attentionRate: update.attentionRate });

    if (update.gestures) setLastGestures(update.gestures);

    const timeLabel = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setEngagementHistory(prev => [
      ...prev.slice(-(MAX_HISTORY - 1)),
      { time: timeLabel, focus: update.engagement, attention: update.attentionRate ?? update.engagement },
    ]);

    // Remove init alert when first analysis arrives
    setBannerAlerts(prev => prev.filter(a => a.id !== 'init'));

    if (update.alert) {
      setBannerAlerts(prev => {
        const filtered = prev.filter(a => a.id !== 'analysis-alert');
        return [...filtered, {
          id: 'analysis-alert',
          message: ALERT_MESSAGES[update.alert!] ?? update.alert!,
          level: update.alert === 'lecturer_absent' ? 3 : 2,
        }];
      });
    } else {
      setBannerAlerts(prev => prev.filter(a => a.id !== 'analysis-alert'));
    }

    onLiveStats?.(update);
  }, [onLiveStats]);

  const engagementColor = stats.engagement > 79 ? 'text-green-400' : stats.engagement > 49 ? 'text-amber-400' : 'text-red-400';
  const sessionDuration = currentSession ? formatElapsed(currentSession.started_at) : undefined;

  return (
    <div className="flex flex-col min-h-full w-full transition-theme" style={{ background: 'var(--surface-0)' }}>
      {/* Top status bar */}
      <div className="p-4 md:p-5 pb-0">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 px-4 md:px-6 py-3 rounded-xl gap-4 xl:gap-0 shadow-lg shadow-blue-900/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm font-semibold text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full live-dot" />
              SYSTEM ONLINE
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/20" />
            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-100">
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Gemini 2.0 Flash + DeepFace
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 xl:gap-6 text-[10px] font-bold text-white/80 uppercase tracking-widest">
            <span>Session: <span className={`font-bold ${currentSession ? 'text-green-300' : 'text-white/40'}`}>
              {currentSession ? currentSession.course_code : 'NONE'}
            </span></span>
            <span>Lecturer: <span className={`font-bold ${stats.lecturerPresent ? 'text-green-300' : 'text-white'}`}>
              {stats.lecturerPresent ? 'Present' : 'Detecting…'}
            </span></span>
            <span>Students: <span className="font-bold text-white">{stats.headcount || '—'}</span></span>
            <span>Engagement: <span className={`font-bold ${engagementColor}`}>
              {stats.engagement ? `${stats.engagement}%` : '—'}
            </span></span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-5 pb-5 pt-4 flex-1 flex flex-col w-full max-w-[1600px] mx-auto">
        {bannerAlerts.map(a => (
          <AlertBanner key={a.id} message={a.message} level={a.level} onDismiss={() => dismissAlert(a.id)} />
        ))}

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--text-0)' }}>
              Lecture Hall Analysis
            </h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-widest border whitespace-nowrap"
                style={{ background: 'var(--brand-dim)', color: 'var(--brand)', borderColor: 'rgba(59,130,246,0.30)' }}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${stats.engagement ? 'bg-green-400 live-dot' : 'bg-gray-500'}`} />
                {stats.engagement ? 'Active Monitoring' : 'Awaiting Source'}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>
                Real-time engagement and classroom sentiment
              </span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-3 w-full xl:w-auto">
            {[
              { label: 'Persons Detected', val: stats.headcount || '—', active: !!stats.headcount },
              { label: 'Class Sentiment',  val: stats.sentiment,          active: stats.sentiment !== 'Awaiting...' },
            ].map(m => (
              <div
                key={m.label}
                className="px-4 py-3 rounded-xl flex flex-col flex-1 sm:flex-none sm:w-[164px] justify-center transition-theme"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
              >
                <span className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-2)' }}>
                  {m.label}
                </span>
                <div
                  className="text-xl font-bold leading-none capitalize"
                  style={{ color: m.active ? 'var(--text-0)' : 'var(--text-3)' }}
                >
                  {m.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-6 w-full">
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-8 xl:row-span-3 w-full">
            <RoomCard
              name={ROOM_NAME}
              capacity={ROOM_CAPACITY}
              roomId={ROOM_ID}
              sessionId={currentSession?.id}
              onStatsUpdate={handleStatsUpdate}
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-4 w-full">
            <SessionPanel
              currentSession={currentSession}
              roomId={ROOM_ID}
              onSessionStart={setCurrentSession}
              onSessionEnd={() => setCurrentSession(null)}
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-4 w-full">
            <EngagementChart data={engagementHistory} sessionDuration={sessionDuration} />
          </div>
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-4 w-full">
            <GestureBreakdown gestures={lastGestures} />
          </div>
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-4 w-full">
            <AlertLog roomId={ROOM_ID} sessionId={currentSession?.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
