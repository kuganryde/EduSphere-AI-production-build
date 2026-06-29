import { useState, useCallback, useRef } from 'react';
import RoomCard from './RoomCard';
import AlertLog from './AlertLog';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';
import LiveEmotionPanel from './LiveEmotionPanel';
import EmotionTimelineChart from './EmotionTimelineChart';
import { Session, AnalysisUpdate, PedagogicalAnalysis, EmotionTimelinePoint } from '../types';

type SlotType = 'webcam' | 'rtsp' | 'upload';

interface CameraSlot {
  key: string; label: string; sublabel: string;
  type: SlotType; url?: string; thumbnail?: string; isFixed: boolean;
}
export interface TriggerSource {
  type: SlotType; url?: string; file?: File; stop?: boolean; nonce: number;
}

const ROOM_ID       = 'room-402-b';
const ROOM_CAPACITY = 34;
const MAX_HISTORY   = 50;

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

const INITIAL_SLOTS: CameraSlot[] = [
  { key: 'webcam', label: 'Onboard Camera', sublabel: 'Built-in webcam',  type: 'webcam', isFixed: true },
  { key: 'rtsp-1', label: 'CCTV Camera 1',  sublabel: 'RTSP / IP stream', type: 'rtsp',   isFixed: false },
  { key: 'rtsp-2', label: 'CCTV Camera 2',  sublabel: 'RTSP / IP stream', type: 'rtsp',   isFixed: false },
  { key: 'upload', label: 'Video Upload',    sublabel: 'Play a recording', type: 'upload', isFixed: true },
];

const SLOT_STYLE: Record<SlotType, { border: string; badge: string; text: string; glow: string }> = {
  webcam: { border: '#3b82f6', badge: 'bg-blue-600',   text: '#60a5fa', glow: 'rgba(59,130,246,0.30)' },
  rtsp:   { border: '#10b981', badge: 'bg-emerald-600', text: '#34d399', glow: 'rgba(16,185,129,0.30)' },
  upload: { border: '#8b5cf6', badge: 'bg-violet-600',  text: '#a78bfa', glow: 'rgba(139,92,246,0.30)' },
};

function SlotTypeIcon({ type, size = 22 }: { type: SlotType; size?: number }) {
  if (type === 'webcam') return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
  if (type === 'rtsp') return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  );
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

/* ── AI Insight generator ───────────────────────────────────── */
function buildInsights(stats: Omit<AnalysisUpdate, 'timestamp'>): { icon: string; text: string; color: string }[] {
  const items: { icon: string; text: string; color: string }[] = [];
  if (!stats.headcount) return [{ icon: '·', text: 'Awaiting live feed — activate a camera source to begin', color: 'var(--text-3)' }];

  if (stats.engagement > 75)
    items.push({ icon: '↑', text: `Engagement strong at ${stats.engagement}%`, color: 'var(--success)' });
  else if (stats.engagement < 45 && stats.engagement > 0)
    items.push({ icon: '↓', text: `Low engagement at ${stats.engagement}% — consider re-engaging`, color: 'var(--warning)' });

  if (stats.headcount > 0)
    items.push({ icon: '👥', text: `${stats.headcount} of ${ROOM_CAPACITY} seats occupied`, color: 'var(--brand)' });

  if (stats.lecturerPresent)
    items.push({ icon: '✓', text: 'Lecturer actively present', color: 'var(--success)' });
  else if (stats.headcount > 0)
    items.push({ icon: '⚠', text: 'Lecturer not detected', color: 'var(--warning)' });

  if (stats.dominantEmotion && stats.dominantEmotion !== 'neutral')
    items.push({ icon: '◎', text: `Dominant emotion: ${stats.dominantEmotion}`, color: 'var(--cyan)' });

  if (stats.sentiment && stats.sentiment !== '—')
    items.push({ icon: '◈', text: `Class sentiment: ${stats.sentiment}`, color: stats.sentiment === 'Positive' ? 'var(--success)' : stats.sentiment === 'Negative' ? 'var(--danger)' : 'var(--text-1)' });

  if (stats.alert === 'high_distraction')
    items.push({ icon: '!', text: 'High distraction detected — class needs re-engagement', color: 'var(--danger)' });
  if (stats.alert === 'low_attendance')
    items.push({ icon: '!', text: 'Below-capacity attendance', color: 'var(--warning)' });

  if (stats.pedagogicalNote)
    items.push({ icon: '💡', text: stats.pedagogicalNote, color: '#a78bfa' });

  return items.length ? items : [{ icon: '✓', text: 'Session running nominally', color: 'var(--success)' }];
}

interface DashboardProps { onLiveStats?: (update: AnalysisUpdate) => void; }

export default function Dashboard({ onLiveStats }: DashboardProps) {
  const [slots, setSlots]           = useState<CameraSlot[]>(INITIAL_SLOTS);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [trigger, setTrigger]       = useState<TriggerSource | null>(null);
  const [urlModal, setUrlModal]     = useState<{ slotKey: string; current?: string } | null>(null);
  const [urlInput, setUrlInput]     = useState('');
  const [addRtspModal, setAddRtspModal] = useState(false);
  const [newCamLabel, setNewCamLabel]   = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<Omit<AnalysisUpdate, 'timestamp'>>({
    engagement: 0, headcount: 0, sentiment: '—', lecturerPresent: false,
    gestures: null, alert: null, attentionRate: null,
    emotionBreakdown: null, dominantEmotion: null, pedagogicalNote: null, faceEmotions: [],
  });
  const [engHistory, setEngHistory]         = useState<{ time: string; focus: number; attention: number }[]>([]);
  const [lastGestures, setLastGestures]     = useState<PedagogicalAnalysis['gestures'] | null>(null);
  const [emotionHistory, setEmotionHistory] = useState<EmotionTimelinePoint[]>([]);
  const [liveEmotionData, setLiveEmotionData] = useState<{
    emotionBreakdown: Record<string, number> | null; dominantEmotion: string | null;
    pedagogicalNote: string | null; faceEmotions: Array<{ emotion: string; attention: boolean; confidence: number }>;
  }>({ emotionBreakdown: null, dominantEmotion: null, pedagogicalNote: null, faceEmotions: [] });

  const handleRtspThumbnail = useCallback((thumbnail: string) => {
    if (!activeSlotKey) return;
    setSlots(prev => prev.map(s => s.key === activeSlotKey ? { ...s, thumbnail } : s));
  }, [activeSlotKey]);

  const handleStatsUpdate = useCallback((update: AnalysisUpdate) => {
    setStats({ engagement: update.engagement, headcount: update.headcount, sentiment: update.sentiment,
      lecturerPresent: update.lecturerPresent, gestures: update.gestures, alert: update.alert,
      attentionRate: update.attentionRate, emotionBreakdown: update.emotionBreakdown ?? null,
      dominantEmotion: update.dominantEmotion ?? null, pedagogicalNote: update.pedagogicalNote ?? null,
      faceEmotions: update.faceEmotions ?? [] });
    if (update.gestures) setLastGestures(update.gestures);
    const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setEngHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)),
      { time: t, focus: update.engagement, attention: update.attentionRate ?? update.engagement }]);
    setLiveEmotionData({ emotionBreakdown: update.emotionBreakdown ?? null,
      dominantEmotion: update.dominantEmotion ?? null, pedagogicalNote: update.pedagogicalNote ?? null,
      faceEmotions: update.faceEmotions ?? [] });
    if (update.emotionBreakdown) {
      const eb = update.emotionBreakdown;
      setEmotionHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), {
        time: t, angry: eb.angry ?? 0, disgust: eb.disgust ?? 0, fear: eb.fear ?? 0,
        happy: eb.happy ?? 0, sad: eb.sad ?? 0, surprise: eb.surprise ?? 0, neutral: eb.neutral ?? 0,
        engagement: update.engagement, attention: update.attentionRate ?? update.engagement,
        sentiment: update.sentiment,
      }]);
    }
    onLiveStats?.(update);
  }, [onLiveStats]);

  const activateSlot = (slot: CameraSlot) => {
    if (slot.type === 'rtsp' && !slot.url) {
      setUrlModal({ slotKey: slot.key, current: '' }); setUrlInput(''); return;
    }
    if (slot.type === 'upload') { fileInputRef.current?.click(); return; }
    setActiveSlotKey(slot.key);
    setTrigger({ type: slot.type, url: slot.url, nonce: Date.now() });
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActiveSlotKey('upload');
    setTrigger({ type: 'upload', file, nonce: Date.now() });
    e.target.value = '';
  };

  const stopActive = () => {
    setActiveSlotKey(null);
    setTrigger({ type: 'webcam', stop: true, nonce: Date.now() });
    setStats({ engagement: 0, headcount: 0, sentiment: '—', lecturerPresent: false, gestures: null,
      alert: null, attentionRate: null, emotionBreakdown: null, dominantEmotion: null,
      pedagogicalNote: null, faceEmotions: [] });
    setLiveEmotionData({ emotionBreakdown: null, dominantEmotion: null, pedagogicalNote: null, faceEmotions: [] });
    setEmotionHistory([]);
  };

  const confirmRtspUrl = () => {
    if (!urlModal || !urlInput.trim()) return;
    setSlots(prev => prev.map(s => s.key === urlModal.slotKey ? { ...s, url: urlInput.trim() } : s));
    setActiveSlotKey(urlModal.slotKey);
    setTrigger({ type: 'rtsp', url: urlInput.trim(), nonce: Date.now() });
    setUrlModal(null); setUrlInput('');
  };

  const addRtspSlot = () => {
    if (!urlInput.trim()) return;
    const key   = `rtsp-${Date.now()}`;
    const label = newCamLabel.trim() || `CCTV Camera ${slots.filter(s => s.type === 'rtsp').length + 1}`;
    setSlots(prev => [...prev, { key, label, sublabel: urlInput.trim(), type: 'rtsp', url: urlInput.trim(), isFixed: false }]);
    setAddRtspModal(false); setUrlInput(''); setNewCamLabel('');
    setActiveSlotKey(key);
    setTrigger({ type: 'rtsp', url: urlInput.trim(), nonce: Date.now() });
  };

  const removeSlot = (key: string) => {
    if (activeSlotKey === key) stopActive();
    setSlots(prev => prev.filter(s => s.key !== key));
  };

  const sessionDuration = currentSession ? formatElapsed(currentSession.started_at) : undefined;
  const engColor = stats.engagement > 79 ? 'var(--success)' : stats.engagement > 49 ? 'var(--warning)' : stats.engagement > 0 ? 'var(--danger)' : 'var(--text-3)';
  const insights = buildInsights(stats);

  /* ── KPI definitions ──────────────────────────────────────── */
  const kpis = [
    {
      label: 'Engagement',
      value: stats.engagement ? `${stats.engagement}%` : '—',
      color: engColor,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      sub: stats.engagement > 0 ? (stats.engagement > 70 ? 'Strong' : stats.engagement > 40 ? 'Moderate' : 'Low') : 'No feed',
      bar: stats.engagement,
    },
    {
      label: 'Headcount',
      value: stats.headcount ? `${stats.headcount}` : '—',
      color: 'var(--brand)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      sub: stats.headcount ? `of ${ROOM_CAPACITY} capacity` : 'No feed',
      bar: stats.headcount ? Math.round(stats.headcount / ROOM_CAPACITY * 100) : 0,
    },
    {
      label: 'Attention',
      value: stats.attentionRate != null ? `${stats.attentionRate}%` : '—',
      color: stats.attentionRate != null ? (stats.attentionRate > 70 ? 'var(--success)' : stats.attentionRate > 40 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-3)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      sub: stats.attentionRate != null ? 'Face attention rate' : 'No feed',
      bar: stats.attentionRate ?? 0,
    },
    {
      label: 'Sentiment',
      value: stats.sentiment,
      color: stats.sentiment === 'Positive' ? 'var(--success)' : stats.sentiment === 'Negative' ? 'var(--danger)' : stats.sentiment !== '—' ? 'var(--text-1)' : 'var(--text-3)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      sub: stats.dominantEmotion ? `Dominant: ${stats.dominantEmotion}` : 'Class mood',
      bar: stats.sentiment === 'Positive' ? 80 : stats.sentiment === 'Negative' ? 20 : stats.sentiment !== '—' ? 50 : 0,
    },
    {
      label: 'Lecturer',
      value: stats.headcount > 0 ? (stats.lecturerPresent ? 'Present' : 'Absent') : '—',
      color: stats.headcount > 0 ? (stats.lecturerPresent ? 'var(--success)' : 'var(--warning)') : 'var(--text-3)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      sub: 'Supervisor presence',
      bar: stats.lecturerPresent ? 100 : 0,
    },
    {
      label: 'Alert',
      value: stats.alert ? stats.alert.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : (stats.headcount > 0 ? 'None' : '—'),
      color: stats.alert ? 'var(--danger)' : stats.headcount > 0 ? 'var(--success)' : 'var(--text-3)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
      sub: stats.alert ? 'Action required' : 'System status',
      bar: stats.alert ? 100 : 0,
    },
  ];

  return (
    <div className="flex flex-col min-h-full w-full transition-theme" style={{ background: 'var(--surface-0)' }}>

      {/* ── Session info bar ─────────────────────────────────── */}
      <div
        className="px-5 py-2.5 shrink-0 flex items-center justify-between gap-3"
        style={{ background: 'var(--surface-1)', borderBottom: '1px solid var(--border-0)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
            Room 402-B
          </span>
          {activeSlotKey && (
            <>
              <div className="w-px h-3" style={{ background: 'var(--border-1)' }} />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: 'var(--success)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'var(--success)' }}>LIVE</span>
              </div>
              {sessionDuration && (
                <>
                  <div className="w-px h-3" style={{ background: 'var(--border-1)' }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-2)' }}>
                    {sessionDuration}
                  </span>
                </>
              )}
              {stats.engagement > 0 && (
                <>
                  <div className="w-px h-3" style={{ background: 'var(--border-1)' }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: engColor }}>
                    {stats.engagement}% engagement
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-mono px-2 py-1 rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border-0)' }}>
            Gemini 2.0 · HSEmotion · YOLOv11
          </span>
          {activeSlotKey && (
            <button
              onClick={stopActive}
              className="px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{ background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.40)', color: 'var(--danger)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.20)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)')}
            >
              Stop Feed
            </button>
          )}
        </div>
      </div>

      {/* ── Camera Source Strip ──────────────────────────────── */}
      <div className="px-5 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto pb-3 no-scrollbar">
          {slots.map(slot => {
            const style   = SLOT_STYLE[slot.type];
            const isActive = activeSlotKey === slot.key;
            const hasUrl   = slot.type !== 'webcam' && slot.type !== 'upload' ? !!slot.url : true;
            return (
              <div
                key={slot.key}
                className="relative flex-shrink-0 cursor-pointer group"
                style={{ width: 190 }}
                onClick={() => activateSlot(slot)}
              >
                <div
                  className="rounded-2xl overflow-hidden relative transition-all duration-200"
                  style={{
                    height: 118,
                    background: 'var(--surface-2)',
                    border: `2px solid ${isActive ? style.border : 'var(--border-0)'}`,
                    boxShadow: isActive ? `0 0 0 3px ${style.glow}, var(--shadow-md)` : 'var(--shadow-sm)',
                  }}
                >
                  {slot.thumbnail && isActive ? (
                    <img src={slot.thumbnail} alt={slot.label} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-2"
                      style={{
                        background: isActive ? `${style.border}12` : 'transparent',
                        color: isActive ? style.text : 'var(--text-3)',
                      }}
                    >
                      <SlotTypeIcon type={slot.type} size={26} />
                      {!hasUrl && (
                        <span className="text-[9px] font-semibold uppercase tracking-widest"
                              style={{ color: 'var(--text-3)' }}>
                          Click to configure
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {isActive ? (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white uppercase ${style.badge}`}>
                        <span className="w-1 h-1 rounded-full bg-white live-dot" /> Live
                      </span>
                    ) : (
                      <span className="flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase"
                            style={{ background: 'rgba(0,0,0,0.60)', color: 'rgba(255,255,255,0.40)' }}>
                        Idle
                      </span>
                    )}
                  </div>

                  {/* Type pill */}
                  <div className="absolute bottom-2 left-2">
                    <span className="px-1.5 py-0.5 rounded-md text-[8px] font-mono uppercase"
                          style={{ background: 'rgba(0,0,0,0.60)', color: style.text }}>
                      {slot.type}
                    </span>
                  </div>

                  {/* Remove button */}
                  {!slot.isFixed && !isActive && (
                    <button
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 text-white/50 hover:text-red-400 text-xs hidden group-hover:flex items-center justify-center"
                      onClick={e => { e.stopPropagation(); removeSlot(slot.key); }}
                    >
                      ×
                    </button>
                  )}

                  {/* Edit URL */}
                  {slot.type === 'rtsp' && slot.url && !isActive && (
                    <button
                      className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-mono hidden group-hover:block"
                      style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.50)' }}
                      onClick={e => { e.stopPropagation(); setUrlModal({ slotKey: slot.key, current: slot.url }); setUrlInput(slot.url ?? ''); }}
                    >
                      edit
                    </button>
                  )}
                </div>

                <div className="mt-1.5 px-0.5">
                  <p className="text-[11px] font-semibold truncate"
                     style={{ color: isActive ? 'var(--text-0)' : 'var(--text-1)' }}>
                    {slot.label}
                  </p>
                  <p className="text-[9px] truncate" style={{ color: 'var(--text-3)', maxWidth: 185 }}>
                    {slot.url ? slot.url : slot.sublabel}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Add RTSP camera */}
          <div
            className="flex-shrink-0 cursor-pointer"
            style={{ width: 190 }}
            onClick={() => { setAddRtspModal(true); setUrlInput(''); setNewCamLabel(''); }}
          >
            <div
              className="rounded-2xl flex flex-col items-center justify-center gap-2 transition-all"
              style={{ height: 118, border: '2px dashed var(--border-1)', background: 'transparent' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.40)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-1)')}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Add RTSP Camera
              </span>
            </div>
            <div className="mt-1.5 px-0.5">
              <p className="text-[11px] font-semibold" style={{ color: 'var(--text-2)' }}>New Feed</p>
              <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>RTSP / IP camera</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Insights strip ────────────────────────────────── */}
      <div
        className="mx-5 mb-3 rounded-2xl px-4 py-3 flex items-start gap-3"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}
      >
        <div className="shrink-0 flex items-center gap-1.5 mr-1 mt-0.5">
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--indigo)' }}>
            AI
          </span>
          <div className="w-px h-3" style={{ background: 'var(--border-1)' }} />
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          {insights.map((ins, i) => (
            <span key={i} className="insight-chip">
              <span className="font-bold" style={{ color: ins.color, fontSize: 11 }}>{ins.icon}</span>
              <span>{ins.text}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────── */}
      <div className="px-5 mb-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="kpi-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                {kpi.label}
              </span>
              <span style={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</span>
            </div>
            <p className="text-xl font-black leading-none mb-1.5" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            <div className="eng-bar mb-1.5">
              <div className="eng-bar-fill" style={{
                width: `${kpi.bar}%`,
                background: kpi.color === 'var(--danger)' ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : kpi.color === 'var(--success)' ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                  : kpi.color === 'var(--warning)' ? 'linear-gradient(90deg, #f59e0b, #fb923c)'
                  : 'linear-gradient(90deg, var(--brand), var(--indigo))',
              }} />
            </div>
            <p className="text-[9px]" style={{ color: 'var(--text-3)' }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main content grid ────────────────────────────────── */}
      <div className="flex-1 px-5 pb-5 flex flex-col gap-4 min-h-0 overflow-auto">

        {/* Row 1: video + right analytics */}
        <div className="flex flex-col xl:flex-row gap-4" style={{ minHeight: 420 }}>

          {/* Video feed */}
          <div className="flex-1 min-w-0">
            <RoomCard
              name="Room 402-B / Main Stage"
              capacity={ROOM_CAPACITY}
              roomId={ROOM_ID}
              sessionId={currentSession?.id}
              onStatsUpdate={handleStatsUpdate}
              triggerSource={trigger}
              onRtspThumbnail={handleRtspThumbnail}
              externalFileInput={fileInputRef}
            />
          </div>

          {/* Right analytics column */}
          <div className="xl:w-[290px] flex flex-col gap-3 shrink-0">
            {/* Live emotion panel */}
            <div className="flex-1 min-h-0">
              <LiveEmotionPanel
                emotionBreakdown={liveEmotionData.emotionBreakdown}
                dominantEmotion={liveEmotionData.dominantEmotion}
                pedagogicalNote={liveEmotionData.pedagogicalNote}
                faceEmotions={liveEmotionData.faceEmotions}
                isLive={!!activeSlotKey}
              />
            </div>

            {/* Session panel */}
            <div className="shrink-0">
              <SessionPanel
                currentSession={currentSession}
                roomId={ROOM_ID}
                onSessionStart={setCurrentSession}
                onSessionEnd={() => setCurrentSession(null)}
              />
            </div>
          </div>
        </div>

        {/* Row 2: charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="xl:col-span-2">
            <EmotionTimelineChart data={emotionHistory} />
          </div>
          <div className="xl:col-span-1">
            <EngagementChart data={engHistory} sessionDuration={sessionDuration} />
          </div>
          <div className="xl:col-span-1">
            <GestureBreakdown gestures={lastGestures} />
          </div>
        </div>

        {/* Alerts */}
        <AlertLog roomId={ROOM_ID} sessionId={currentSession?.id} />

        {/* Footer system info */}
        <div
          className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-0)' }}
        >
          {[
            { label: 'Platform', val: 'EduSphere AI v3' },
            { label: 'Models', val: 'Gemini 2.0 · HSEmotion B2 · YOLOv11-Pose · YOLO-World' },
            { label: 'Room', val: 'Room 402-B' },
            { label: 'Capacity', val: `${ROOM_CAPACITY} seats` },
            { label: 'License', val: 'University Edition' },
          ].map(f => (
            <span key={f.label} className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                {f.label}:
              </span>
              <span className="text-[9px] font-mono" style={{ color: 'var(--text-2)' }}>{f.val}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Hidden file input ────────────────────────────────── */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />

      {/* ── RTSP Configure modal ─────────────────────────────── */}
      {urlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-0)' }}>Configure RTSP Camera</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Enter the RTSP or IP camera stream URL. Full AI analysis runs server-side.
            </p>
            <div className="mb-4 px-3 py-2 rounded-xl text-[11px] font-mono"
                 style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--success)' }}>
              ✓ Results stream via SSE — zero browser latency
            </div>
            <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRtspUrl()}
              placeholder="rtsp://192.168.1.100:554/stream"
              className="field font-mono text-sm mb-4" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setUrlModal(null); setUrlInput(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>
                Cancel
              </button>
              <button onClick={confirmRtspUrl}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors"
                style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add RTSP modal ────────────────────────────────────── */}
      {addRtspModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-0)' }}>Add RTSP Camera</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Add a new IP or RTSP camera to the monitoring strip.
            </p>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>
                  Camera Label
                </label>
                <input type="text" value={newCamLabel} onChange={e => setNewCamLabel(e.target.value)}
                  placeholder="e.g. Lab Entrance" className="field text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>
                  RTSP URL
                </label>
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRtspSlot()}
                  placeholder="rtsp://192.168.1.100:554/stream"
                  className="field font-mono text-sm" autoFocus />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAddRtspModal(false); setUrlInput(''); setNewCamLabel(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>
                Cancel
              </button>
              <button onClick={addRtspSlot}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}>
                Add Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
