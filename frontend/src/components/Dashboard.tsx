import { useState, useCallback, useRef, useEffect } from 'react';
import RoomCard from './RoomCard';
import MockFeedPanel from './MockFeedPanel';
import AlertLog from './AlertLog';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';
import LiveEmotionPanel from './LiveEmotionPanel';
import EmotionTimelineChart from './EmotionTimelineChart';
import { Session, AnalysisUpdate, AlertRecord, PedagogicalAnalysis, EmotionTimelinePoint } from '../types';
import { useDemoMode } from '../context/DemoContext';
import { useMockStream, buildMockAlert, buildMockSession } from '../demo/mockStream';

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
const MAX_PANEL_ALERTS = 5;

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
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
    items.push({ icon: '◎', text: `${stats.headcount} of ${ROOM_CAPACITY} seats occupied`, color: 'var(--brand)' });

  if (stats.lecturerPresent)
    items.push({ icon: '✓', text: 'Lecturer actively present', color: 'var(--success)' });
  else if (stats.headcount > 0)
    items.push({ icon: '⚠', text: 'Lecturer not detected', color: 'var(--warning)' });

  if (stats.dominantEmotion && stats.dominantEmotion !== 'neutral')
    items.push({ icon: '◉', text: `Dominant emotion: ${stats.dominantEmotion}`, color: 'var(--cyan)' });

  if (stats.sentiment && stats.sentiment !== '—')
    items.push({ icon: '◈', text: `Class sentiment: ${stats.sentiment}`, color: stats.sentiment === 'Positive' ? 'var(--success)' : stats.sentiment === 'Negative' ? 'var(--danger)' : 'var(--text-1)' });

  if (stats.alert === 'high_distraction')
    items.push({ icon: '!', text: 'High distraction detected — class needs re-engagement', color: 'var(--danger)' });
  if (stats.alert === 'low_attendance')
    items.push({ icon: '!', text: 'Below-capacity attendance', color: 'var(--warning)' });

  if (stats.pedagogicalNote)
    items.push({ icon: '◆', text: stats.pedagogicalNote, color: '#a78bfa' });

  return items.length ? items : [{ icon: '✓', text: 'Session running nominally', color: 'var(--success)' }];
}

/* ── Emotion color map ──────────────────────────────────────── */
const EMOTION_COLORS: Record<string, string> = {
  happy:    '#10b981',
  neutral:  '#60a5fa',
  sad:      '#6366f1',
  angry:    '#ef4444',
  fear:     '#f59e0b',
  surprise: '#22d3ee',
  disgust:  '#a78bfa',
};

/* ── KpiCard ────────────────────────────────────────────────── */
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  subColor: string;
  accent: string;
  sparkData?: number[];
}

function KpiCard({ icon, label, value, sub, subColor, accent, sparkData }: KpiCardProps) {
  const spark = sparkData && sparkData.length > 1 ? (
    <svg width="56" height="22" viewBox="0 0 56 22" style={{ flexShrink: 0 }}>
      <polyline
        points={sparkData.map((v, i) => `${(i / (sparkData.length - 1)) * 56},${22 - (v / 100) * 18}`).join(' ')}
        fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        opacity={0.65}
      />
    </svg>
  ) : null;

  return (
    <div className="e-card anim-fade-up" style={{ padding: '10px 12px', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.75, borderRadius: '14px 14px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          {icon}
        </div>
        {spark}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-0)', fontFamily: 'JetBrains Mono', letterSpacing: '-0.03em', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: subColor, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  );
}

/* ── EmotionDonut ──────────────────────────────────────────── */
function EmotionDonut({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const R = 44, C = 2 * Math.PI * R;

  let offset = 0;
  const slices = entries.map(([emotion, pct]) => {
    const len = (pct / 100) * C;
    const slice = { emotion, pct, len, offset, color: EMOTION_COLORS[emotion] ?? '#475569' };
    offset += len;
    return slice;
  });

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
        <svg width={100} height={100} viewBox="0 0 100 100">
          <circle cx={50} cy={50} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={13} />
          {slices.map(s => (
            <circle key={s.emotion} cx={50} cy={50} r={R} fill="none"
              stroke={s.color} strokeWidth={11}
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={C / 4 - s.offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-0)', fontFamily: 'JetBrains Mono' }}>{total}</span>
          <span style={{ fontSize: 8, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {entries.slice(0, 7).map(([emotion, pct]) => (
          <div key={emotion} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: EMOTION_COLORS[emotion] ?? '#475569', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-1)', flex: 1, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emotion}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-0)', fontFamily: 'JetBrains Mono', minWidth: 28, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── CircularGauge ─────────────────────────────────────────── */
function CircularGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const R = 24, C = 2 * Math.PI * R;
  const filled = (value / 100) * C;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ position: 'relative', width: 56, height: 56 }}>
        <svg width={56} height={56} viewBox="0 0 56 56">
          <circle cx={28} cy={28} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
          <circle cx={28} cy={28} r={R} fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={`${filled} ${C - filled}`}
            strokeDashoffset={C / 4}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-0)', fontFamily: 'JetBrains Mono' }}>{value}%</span>
        </div>
      </div>
      <span style={{ fontSize: 8, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    </div>
  );
}

/* ── Panel Alerts type ──────────────────────────────────────── */
interface PanelAlert {
  id: string;
  message: string;
  level: 'warn' | 'danger' | 'info';
  time: string;
}

/* ── Right Analytics Panel ──────────────────────────────────── */
interface RightPanelProps {
  stats: Omit<AnalysisUpdate, 'timestamp'>;
  isLive: boolean;
  panelAlerts: PanelAlert[];
  lastUpdated: string;
  sysMetrics: { gpu: number; cpu: number; memory: number; storage: number };
}

function RightAnalyticsPanel({ stats, isLive, panelAlerts, lastUpdated, sysMetrics }: RightPanelProps) {
  const insights = buildInsights(stats);
  const latencyVal = isLive ? 1200 : 0;
  const latencyColor = latencyVal < 2000 ? '#10b981' : latencyVal < 4000 ? '#f59e0b' : '#ef4444';
  const emotionEntries = stats.emotionBreakdown
    ? Object.entries(stats.emotionBreakdown).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
    : [];
  const hasEmotions = emotionEntries.length > 0;

  return (
    <div style={{ width: 292, background: 'var(--surface-1)', borderLeft: '1px solid var(--border-0)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
      <div className="thin-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Emotion Distribution */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-0)' }}>
          <div className="section-header-ent">
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
            EMOTION DISTRIBUTION
          </div>
          {hasEmotions && stats.emotionBreakdown ? (
            <EmotionDonut breakdown={stats.emotionBreakdown} total={stats.headcount} />
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: 11 }}>
              Activate camera to see emotions
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-0)' }}>
          <div className="section-header-ent">
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0, animation: 'neon-pulse 2.4s ease-in-out infinite' }} />
            AI INSIGHTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {insights.slice(0, 5).map((ins, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1, color: ins.color, width: 14, textAlign: 'center' }}>{ins.icon}</span>
                <span style={{ fontSize: 11, lineHeight: 1.4, color: 'rgba(255,255,255,0.65)' }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-0)' }}>
          <div className="section-header-ent">
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
            REAL-TIME SYSTEM STATUS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            <CircularGauge value={sysMetrics.gpu} label="GPU" color="#3b82f6" />
            <CircularGauge value={sysMetrics.cpu} label="CPU" color="#10b981" />
            <CircularGauge value={sysMetrics.memory} label="Mem" color="#f59e0b" />
            <CircularGauge value={sysMetrics.storage} label="Disk" color="#8b5cf6" />
          </div>
          {[
            { label: 'AI Latency',     val: isLive ? `${latencyVal}ms` : '—', color: isLive ? latencyColor : 'var(--text-3)' },
            { label: 'Analysis Rate',  val: isLive ? 'every 2s' : '—',        color: isLive ? 'var(--text-1)' : 'var(--text-3)' },
            { label: 'Faces Detected', val: isLive ? String(stats.headcount) : '—', color: isLive ? 'var(--brand)' : 'var(--text-3)' },
            { label: 'Last Updated',   val: lastUpdated || '—',               color: 'var(--text-2)' },
          ].map(row => (
            <div key={row.label} className="metric-row">
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10 }}>{row.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600, color: row.color }}>{row.val}</span>
            </div>
          ))}
        </div>

        {/* Active Alerts */}
        <div style={{ padding: '12px 14px' }}>
          <div className="section-header-ent">
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            ACTIVE ALERTS
            {panelAlerts.length > 0 && (
              <span className="badge badge-red" style={{ marginLeft: 'auto', fontSize: 9 }}>{panelAlerts.length}</span>
            )}
          </div>
          {panelAlerts.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#10b981' }}>
              <span>✓</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>No active alerts</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {panelAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="alert-item">
                  <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1, color: alert.level === 'danger' ? '#f87171' : alert.level === 'warn' ? '#fbbf24' : '#60a5fa' }}>
                    {alert.level === 'danger' ? '!' : alert.level === 'warn' ? '⚠' : '●'}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 10, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.65)' }}>{alert.message}</p>
                    <p style={{ fontSize: 9, fontFamily: 'JetBrains Mono', marginTop: 2, color: 'rgba(255,255,255,0.25)' }}>{timeAgo(alert.time)}</p>
                  </div>
                </div>
              ))}
              {panelAlerts.length > 3 && (
                <button style={{ fontSize: 10, color: '#60a5fa', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                  View all {panelAlerts.length} alerts →
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Dashboard ──────────────────────────────────────────────── */
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

  const { isDemoMode } = useDemoMode();

  const [mockSession, setMockSession]   = useState<Session | null>(null);
  const [demoAlerts, setDemoAlerts]     = useState<AlertRecord[]>([]);
  const prevDemoAlert                   = useRef<string | null>(null);

  const [panelAlerts, setPanelAlerts]   = useState<PanelAlert[]>([]);
  const [lastUpdated, setLastUpdated]   = useState('');
  const [sysMetrics] = useState({ gpu: 45, cpu: 38, memory: 62, storage: 71 });
  const sparkHistory = useRef<Map<string, number[]>>(new Map());

  useEffect(() => {
    if (isDemoMode) {
      setMockSession(buildMockSession());
    } else {
      setMockSession(null);
      setDemoAlerts([]);
      prevDemoAlert.current = null;
    }
  }, [isDemoMode]);

  useMockStream(isDemoMode, (tick) => {
    handleStatsUpdate(tick.update);
    const alertType = tick.update.alert;
    if (alertType && alertType !== prevDemoAlert.current) {
      prevDemoAlert.current = alertType;
      const sessionId = mockSession?.id ?? 'demo-session-001';
      setDemoAlerts(prev => [
        buildMockAlert(alertType, ROOM_ID, sessionId),
        ...prev.slice(0, 9),
      ]);
    } else if (!alertType) {
      prevDemoAlert.current = null;
    }
  });

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

  const pushSpark = (key: string, value: number) => {
    const prev = sparkHistory.current.get(key) ?? [];
    sparkHistory.current.set(key, [...prev.slice(-7), value]);
  };

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
    const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastUpdated(ts);
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
    pushSpark('headcount', Math.round((update.headcount / ROOM_CAPACITY) * 100));
    pushSpark('attention', update.attentionRate ?? 0);
    pushSpark('engagement', update.engagement);
    pushSpark('alerts', update.alert ? 100 : 0);

    if (update.alert) {
      setPanelAlerts(prev => {
        const newAlert: PanelAlert = {
          id: `${Date.now()}-${update.alert}`,
          message: update.alert === 'high_distraction'
            ? 'High distraction detected — class needs re-engagement'
            : update.alert === 'low_attendance'
              ? 'Below-capacity attendance detected'
              : update.alert ?? 'Alert triggered',
          level: update.alert === 'high_distraction' ? 'danger' : 'warn',
          time: new Date().toISOString(),
        };
        return [newAlert, ...prev].slice(0, MAX_PANEL_ALERTS);
      });
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

  const activeSession   = isDemoMode ? mockSession : currentSession;
  const sessionDuration = activeSession ? formatElapsed(activeSession.started_at) : undefined;
  const isLive          = isDemoMode || !!activeSlotKey;
  const engColor        = stats.engagement > 79 ? 'var(--success)' : stats.engagement > 49 ? 'var(--warning)' : stats.engagement > 0 ? 'var(--danger)' : 'var(--text-3)';
  const getSpark        = (key: string) => sparkHistory.current.get(key) ?? [];

  const attSub      = stats.attentionRate == null ? 'No feed' : stats.attentionRate > 70 ? 'Excellent' : stats.attentionRate > 40 ? 'Good' : 'Poor';
  const attSubColor = stats.attentionRate == null ? 'var(--text-3)' : stats.attentionRate > 70 ? '#10b981' : stats.attentionRate > 40 ? '#f59e0b' : '#ef4444';
  const engSub      = stats.engagement === 0 ? 'No feed' : stats.engagement > 70 ? 'Very Good' : stats.engagement > 40 ? 'Good' : 'Low';
  const engSubColor = stats.engagement === 0 ? 'var(--text-3)' : engColor;

  const kpiCards: KpiCardProps[] = [
    {
      label: 'Students Present',
      value: `${stats.headcount}/${ROOM_CAPACITY}`,
      sub: stats.headcount ? `${Math.round(stats.headcount / ROOM_CAPACITY * 100)}% occupancy` : 'No feed active',
      subColor: stats.headcount ? '#60a5fa' : 'var(--text-3)',
      accent: '#3b82f6',
      sparkData: getSpark('headcount'),
      icon: (<svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    },
    {
      label: 'Attention Score',
      value: stats.attentionRate != null ? `${stats.attentionRate}%` : '—',
      sub: attSub, subColor: attSubColor, accent: '#10b981',
      sparkData: getSpark('attention'),
      icon: (<svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>),
    },
    {
      label: 'Engagement Score',
      value: stats.engagement ? `${stats.engagement}%` : '—',
      sub: engSub, subColor: engSubColor, accent: '#f59e0b',
      sparkData: getSpark('engagement'),
      icon: (<svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>),
    },
    {
      label: 'Class Sentiment',
      value: stats.sentiment !== '—' ? stats.sentiment : '—',
      sub: stats.dominantEmotion ? `Dominant: ${stats.dominantEmotion}` : 'Class mood',
      subColor: stats.sentiment === 'Positive' ? '#10b981' : stats.sentiment === 'Negative' ? '#ef4444' : 'var(--text-3)',
      accent: '#8b5cf6',
      icon: (<svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    },
    {
      label: 'Lecturer Present',
      value: stats.headcount > 0 ? (stats.lecturerPresent ? 'Present' : 'Absent') : '—',
      sub: stats.headcount > 0 ? (stats.lecturerPresent ? 'Active' : 'Inactive') : 'No feed',
      subColor: stats.headcount > 0 ? (stats.lecturerPresent ? '#10b981' : '#f59e0b') : 'var(--text-3)',
      accent: '#06b6d4',
      icon: (<svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>),
    },
    {
      label: 'Active Alerts',
      value: String(panelAlerts.length),
      sub: panelAlerts.length > 0 ? 'Action required' : 'All clear',
      subColor: panelAlerts.length > 0 ? '#ef4444' : '#10b981',
      accent: panelAlerts.length > 0 ? '#ef4444' : '#10b981',
      sparkData: getSpark('alerts'),
      icon: (<svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--surface-0)' }}>

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border-0)', background: 'var(--surface-1)', flexShrink: 0 }}>
        {isDemoMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '5px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}>
            <span className="live-dot" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fbbf24' }}>Demo Mode — Simulated Data</span>
            <span style={{ fontSize: 9, color: 'rgba(251,191,36,0.50)', marginLeft: 4 }}>CS302 · Dr. Sarah Chen</span>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          {kpiCards.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
        </div>
      </div>

      {/* ── Content Row ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* CENTER COLUMN */}
        <div className="thin-scroll" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>

          {/* Live Camera Card */}
          <div className="e-card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--border-0)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="live-dot" style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#ef4444' }} />
                LIVE
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>Live Classroom Feed — Room 402-B</span>
              {isLive && sessionDuration && (
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: 'var(--text-3)', marginLeft: 4 }}>{sessionDuration}</span>
              )}
              {stats.engagement > 0 && (
                <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700, color: engColor, marginLeft: 4 }}>{stats.engagement}% ENG</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono', padding: '3px 8px', borderRadius: 6, background: 'var(--surface-3)', color: 'var(--text-3)', border: '1px solid var(--border-0)' }}>
                  Gemini 2.0 · HSEmotion · YOLO
                </span>
                {!isDemoMode && activeSlotKey && (
                  <button onClick={stopActive} style={{ fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 7, background: 'var(--danger-dim)', border: '1px solid rgba(239,68,68,0.40)', color: 'var(--danger)', cursor: 'pointer' }}>
                    Stop Feed
                  </button>
                )}
              </div>
            </div>
            <div style={{ minHeight: 300 }}>
              {isDemoMode ? (
                <MockFeedPanel faceEmotions={liveEmotionData.faceEmotions} headcount={stats.headcount} engagement={stats.engagement} isRunning={isDemoMode} />
              ) : (
                <RoomCard name="Room 402-B / Main Stage" capacity={ROOM_CAPACITY} roomId={ROOM_ID} sessionId={currentSession?.id} onStatsUpdate={handleStatsUpdate} triggerSource={trigger} onRtspThumbnail={handleRtspThumbnail} externalFileInput={fileInputRef} />
              )}
            </div>
          </div>

          {/* Camera slot strip (hidden in demo) */}
          {!isDemoMode && (
            <div className="no-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, paddingBottom: 4 }}>
              {slots.map(slot => {
                const slotS    = SLOT_STYLE[slot.type];
                const isActive = activeSlotKey === slot.key;
                const hasUrl   = slot.type !== 'webcam' && slot.type !== 'upload' ? !!slot.url : true;
                return (
                  <div key={slot.key} className={`cam-card${isActive ? ' active' : ''}`} style={{ width: 152, flexShrink: 0, cursor: 'pointer' }} onClick={() => activateSlot(slot)}>
                    <div style={{ height: 80, background: 'var(--surface-2)', position: 'relative', overflow: 'hidden', border: isActive ? `2px solid ${slotS.border}` : '2px solid transparent', boxShadow: isActive ? `0 0 0 2px ${slotS.glow}` : 'none' }}>
                      {slot.thumbnail && isActive ? (
                        <img src={slot.thumbnail} alt={slot.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: isActive ? `${slotS.border}10` : 'transparent', color: isActive ? slotS.text : 'var(--text-3)' }}>
                          <SlotTypeIcon type={slot.type} size={20} />
                          {!hasUrl && <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Click to configure</span>}
                        </div>
                      )}
                      <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 8, padding: '2px 5px', borderRadius: 4, background: isActive ? slotS.border : 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.85)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {isActive ? 'LIVE' : 'IDLE'}
                      </span>
                      <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: isActive ? '#10b981' : 'rgba(255,255,255,0.18)' }} />
                      {!slot.isFixed && !isActive && (
                        <button style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); removeSlot(slot.key); }}>×</button>
                      )}
                    </div>
                    <div style={{ padding: '5px 6px' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? 'var(--text-0)' : 'var(--text-1)' }}>{slot.label}</p>
                      <p style={{ fontSize: 8, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.url ? slot.url : slot.sublabel}</p>
                    </div>
                  </div>
                );
              })}
              <div style={{ width: 152, flexShrink: 0, cursor: 'pointer', borderRadius: 10, border: '2px dashed var(--border-1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 106 }} onClick={() => { setAddRtspModal(true); setUrlInput(''); setNewCamLabel(''); }}>
                <svg style={{ color: 'var(--text-3)' }} width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" /></svg>
                <span style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>Add RTSP</span>
              </div>
            </div>
          )}

          {/* Session Panel */}
          <div style={{ flexShrink: 0 }}>
            <SessionPanel currentSession={activeSession} roomId={ROOM_ID} onSessionStart={isDemoMode ? setMockSession : setCurrentSession} onSessionEnd={isDemoMode ? () => setMockSession(buildMockSession()) : () => setCurrentSession(null)} demoMode={isDemoMode} />
          </div>

          {/* Bottom charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
            <div className="e-card" style={{ padding: 12 }}>
              <EngagementChart data={engHistory} sessionDuration={sessionDuration} />
            </div>
            <div className="e-card" style={{ padding: 12 }}>
              <EmotionTimelineChart data={emotionHistory} />
            </div>
          </div>

          {/* Gesture Breakdown */}
          <div style={{ flexShrink: 0 }}>
            <GestureBreakdown gestures={lastGestures} />
          </div>

          {/* Alert Log */}
          <div style={{ flexShrink: 0 }}>
            <AlertLog roomId={ROOM_ID} sessionId={activeSession?.id} demoMode={isDemoMode} demoAlerts={demoAlerts} onDemoAlertDismiss={(id) => setDemoAlerts(prev => prev.filter(a => a.id !== id))} onDemoAlertDismissAll={() => setDemoAlerts([])} />
          </div>

          {/* LiveEmotionPanel */}
          <div style={{ flexShrink: 0 }}>
            <LiveEmotionPanel emotionBreakdown={liveEmotionData.emotionBreakdown} dominantEmotion={liveEmotionData.dominantEmotion} pedagogicalNote={liveEmotionData.pedagogicalNote} faceEmotions={liveEmotionData.faceEmotions} isLive={isLive} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <RightAnalyticsPanel stats={stats} isLive={isLive} panelAlerts={panelAlerts} lastUpdated={lastUpdated} sysMetrics={sysMetrics} />
      </div>

      {/* Footer */}
      <div style={{ padding: '5px 16px', borderTop: '1px solid var(--border-0)', background: 'var(--surface-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          EduSphere AI Classroom Intelligence Platform · PDPA Compliant · Secure · AI Powered · Room 402-B · {ROOM_CAPACITY} seats
        </span>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />

      {/* RTSP Configure modal */}
      {urlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-0)' }}>Configure RTSP Camera</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Enter the RTSP or IP camera stream URL. Full AI analysis runs server-side.</p>
            <div className="mb-4 px-3 py-2 rounded-xl text-[11px] font-mono" style={{ background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.35)', color: 'var(--success)' }}>✓ Results stream via SSE — zero browser latency</div>
            <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmRtspUrl()} placeholder="rtsp://192.168.1.100:554/stream" className="field font-mono text-sm mb-4" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setUrlModal(null); setUrlInput(''); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>Cancel</button>
              <button onClick={confirmRtspUrl} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)' }}>Connect</button>
            </div>
          </div>
        </div>
      )}

      {/* Add RTSP modal */}
      {addRtspModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}>
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-0)' }}>Add RTSP Camera</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Add a new IP or RTSP camera to the monitoring strip.</p>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>Camera Label</label>
                <input type="text" value={newCamLabel} onChange={e => setNewCamLabel(e.target.value)} placeholder="e.g. Lab Entrance" className="field text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>RTSP URL</label>
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRtspSlot()} placeholder="rtsp://192.168.1.100:554/stream" className="field font-mono text-sm" autoFocus />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAddRtspModal(false); setUrlInput(''); setNewCamLabel(''); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>Cancel</button>
              <button onClick={addRtspSlot} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold" style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)' }}>Add Camera</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
