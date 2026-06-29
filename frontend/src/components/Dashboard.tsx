import { useState, useCallback, useRef } from 'react';
import RoomCard from './RoomCard';
import AlertLog from './AlertLog';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';
import { Session, AnalysisUpdate, PedagogicalAnalysis } from '../types';

/* ── Types ─────────────────────────────────────────────────────── */
type SlotType = 'webcam' | 'rtsp' | 'upload';

interface CameraSlot {
  key: string;
  label: string;
  sublabel: string;
  type: SlotType;
  url?: string;          // RTSP URL
  thumbnail?: string;    // last captured frame (data URI)
  isFixed: boolean;      // cannot be removed
}

export interface TriggerSource {
  type: SlotType;
  url?: string;
  file?: File;           // for upload slots
  stop?: boolean;        // when true, RoomCard stops the active feed
  nonce: number;         // increment to re-trigger same slot
}

const ROOM_ID       = 'room-402-b';
const ROOM_CAPACITY = 34;
const MAX_HISTORY   = 50;

const ALERT_MESSAGES: Record<string, string> = {
  high_distraction: 'High distraction detected — class may need re-engagement',
  low_attendance:   'Low attendance — headcount below expected capacity',
  lecturer_absent:  'Lecturer not visible — supervision gap detected',
};

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const INITIAL_SLOTS: CameraSlot[] = [
  { key: 'webcam', label: 'Onboard Camera', sublabel: 'Built-in webcam',    type: 'webcam', isFixed: true },
  { key: 'rtsp-1', label: 'CCTV Camera 1',  sublabel: 'RTSP / IP stream',   type: 'rtsp',   isFixed: false },
  { key: 'rtsp-2', label: 'CCTV Camera 2',  sublabel: 'RTSP / IP stream',   type: 'rtsp',   isFixed: false },
  { key: 'upload', label: 'Video Upload',    sublabel: 'Play a recording',   type: 'upload', isFixed: true },
];

/* ── Slot Icon ──────────────────────────────────────────────────── */
function SlotIcon({ type, size = 20 }: { type: SlotType; size?: number }) {
  const s = size;
  if (type === 'webcam')
    return (
      <svg width={s} height={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  if (type === 'rtsp')
    return (
      <svg width={s} height={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    );
  return (
    <svg width={s} height={s} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

const SLOT_ACCENT: Record<SlotType, { ring: string; badge: string; text: string; bg: string }> = {
  webcam: { ring: 'rgba(59,130,246,0.50)',  badge: 'bg-blue-600',   text: 'text-blue-400',   bg: 'rgba(59,130,246,0.08)' },
  rtsp:   { ring: 'rgba(16,185,129,0.50)',  badge: 'bg-emerald-600',text: 'text-emerald-400', bg: 'rgba(16,185,129,0.08)' },
  upload: { ring: 'rgba(139,92,246,0.50)',  badge: 'bg-violet-600', text: 'text-violet-400',  bg: 'rgba(139,92,246,0.08)' },
};

interface DashboardProps {
  onLiveStats?: (update: AnalysisUpdate) => void;
}

export default function Dashboard({ onLiveStats }: DashboardProps) {
  /* Camera slots ------------------------------------------------ */
  const [slots, setSlots] = useState<CameraSlot[]>(INITIAL_SLOTS);
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<TriggerSource | null>(null);
  const [urlModal, setUrlModal] = useState<{ slotKey: string; current?: string } | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [addRtspModal, setAddRtspModal] = useState(false);
  const [newCamLabel, setNewCamLabel] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Session / analysis state ----------------------------------- */
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [stats, setStats] = useState<Omit<AnalysisUpdate, 'timestamp'>>({
    engagement: 0, headcount: 0, sentiment: '—', lecturerPresent: false,
    gestures: null, alert: null, attentionRate: null,
  });
  const [engHistory, setEngHistory] = useState<{ time: string; focus: number; attention: number }[]>([]);
  const [lastGestures, setLastGestures] = useState<PedagogicalAnalysis['gestures'] | null>(null);

  /* When RoomCard streams a new RTSP thumbnail, store it in the slot */
  const handleRtspThumbnail = useCallback((thumbnail: string) => {
    if (!activeSlotKey) return;
    setSlots(prev => prev.map(s => s.key === activeSlotKey ? { ...s, thumbnail } : s));
  }, [activeSlotKey]);

  /* Stats update from RoomCard --------------------------------- */
  const handleStatsUpdate = useCallback((update: AnalysisUpdate) => {
    setStats({ engagement: update.engagement, headcount: update.headcount, sentiment: update.sentiment,
      lecturerPresent: update.lecturerPresent, gestures: update.gestures, alert: update.alert,
      attentionRate: update.attentionRate });
    if (update.gestures) setLastGestures(update.gestures);
    const t = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setEngHistory(prev => [
      ...prev.slice(-(MAX_HISTORY - 1)),
      { time: t, focus: update.engagement, attention: update.attentionRate ?? update.engagement },
    ]);
    onLiveStats?.(update);
  }, [onLiveStats]);

  /* ── Slot activation ──────────────────────────────────────── */
  const activateSlot = (slot: CameraSlot) => {
    if (slot.type === 'rtsp' && !slot.url) {
      setUrlModal({ slotKey: slot.key, current: '' });
      setUrlInput('');
      return;
    }
    if (slot.type === 'upload') {
      fileInputRef.current?.click();
      return;
    }
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
    // Send explicit stop signal so RoomCard tears down its active stream
    setTrigger({ type: 'webcam', stop: true, nonce: Date.now() });
    setStats({ engagement: 0, headcount: 0, sentiment: '—', lecturerPresent: false, gestures: null, alert: null, attentionRate: null });
  };

  /* URL modal confirm */
  const confirmRtspUrl = () => {
    if (!urlModal || !urlInput.trim()) return;
    setSlots(prev => prev.map(s => s.key === urlModal.slotKey ? { ...s, url: urlInput.trim() } : s));
    setActiveSlotKey(urlModal.slotKey);
    setTrigger({ type: 'rtsp', url: urlInput.trim(), nonce: Date.now() });
    setUrlModal(null);
    setUrlInput('');
  };

  /* Add new RTSP slot */
  const addRtspSlot = () => {
    if (!urlInput.trim()) return;
    const key = `rtsp-${Date.now()}`;
    const label = newCamLabel.trim() || `CCTV Camera ${slots.filter(s => s.type === 'rtsp').length + 1}`;
    setSlots(prev => [...prev, { key, label, sublabel: urlInput.trim(), type: 'rtsp', url: urlInput.trim(), isFixed: false }]);
    setAddRtspModal(false);
    setUrlInput('');
    setNewCamLabel('');
    setActiveSlotKey(key);
    setTrigger({ type: 'rtsp', url: urlInput.trim(), nonce: Date.now() });
  };

  const removeSlot = (key: string) => {
    if (activeSlotKey === key) stopActive();
    setSlots(prev => prev.filter(s => s.key !== key));
  };

  const sessionDuration = currentSession ? formatElapsed(currentSession.started_at) : undefined;
  const engColor = stats.engagement > 79 ? 'var(--success)' : stats.engagement > 49 ? 'var(--warning)' : 'var(--danger)';

  return (
    <div className="flex flex-col min-h-full w-full transition-theme" style={{ background: 'var(--surface-0)' }}>

      {/* ── Page Header ──────────────────────────────────────────── */}
      <div
        className="px-6 py-4 shrink-0 flex items-center justify-between"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-0)' }}
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight uppercase" style={{ color: 'var(--text-0)' }}>
            Dashboard
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            Welcome to EduSphere AI · Real-time classroom intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeSlotKey && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest"
                 style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', color: 'var(--success)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot" />
              Live
            </div>
          )}
          <div className="text-[10px] font-mono px-2 py-1 rounded-lg"
               style={{ background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-0)' }}>
            Gemini 2.0 Flash + DeepFace
          </div>
        </div>
      </div>

      {/* ── Camera Source Strip ───────────────────────────────────
          Each tile = one camera source. Click to switch instantly.
      ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-0 shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto pb-3 no-scrollbar">
          {slots.map(slot => {
            const accent = SLOT_ACCENT[slot.type];
            const isActive = activeSlotKey === slot.key;
            const hasUrl = slot.type !== 'webcam' && slot.type !== 'upload' ? !!slot.url : true;

            return (
              <div
                key={slot.key}
                className="relative flex-shrink-0 cursor-pointer group"
                style={{ width: 180 }}
                onClick={() => activateSlot(slot)}
              >
                {/* Thumbnail area */}
                <div
                  className="rounded-xl overflow-hidden relative"
                  style={{
                    height: 108,
                    background: slot.thumbnail && isActive ? 'transparent' : 'var(--surface-3)',
                    border: `2px solid ${isActive ? accent.ring : 'var(--border-0)'}`,
                    boxShadow: isActive ? `0 0 0 2px ${accent.ring}` : 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  {slot.thumbnail && isActive ? (
                    <img src={slot.thumbnail} alt={slot.label} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-2"
                      style={{ color: isActive ? accent.text.replace('text-', '') : 'var(--text-3)', background: isActive ? accent.bg : 'transparent' }}
                    >
                      <span style={{ color: isActive ? undefined : 'var(--text-3)', opacity: isActive ? 1 : 0.5 }}>
                        <SlotIcon type={slot.type} size={28} />
                      </span>
                      {!hasUrl && (
                        <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                          Click to configure
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {isActive ? (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase ${accent.badge}`}>
                        <span className="w-1 h-1 rounded-full bg-white live-dot" />
                        Live
                      </span>
                    ) : (
                      <span className="flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                            style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.45)' }}>
                        Idle
                      </span>
                    )}
                  </div>

                  {/* Remove button (non-fixed, non-active) */}
                  {!slot.isFixed && !isActive && (
                    <button
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/60 text-white/60 hover:text-red-400 text-xs hidden group-hover:flex items-center justify-center"
                      onClick={e => { e.stopPropagation(); removeSlot(slot.key); }}
                    >
                      ×
                    </button>
                  )}

                  {/* Edit URL badge for RTSP */}
                  {slot.type === 'rtsp' && slot.url && !isActive && (
                    <button
                      className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-mono hidden group-hover:block"
                      style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.55)' }}
                      onClick={e => { e.stopPropagation(); setUrlModal({ slotKey: slot.key, current: slot.url }); setUrlInput(slot.url ?? ''); }}
                    >
                      edit url
                    </button>
                  )}
                </div>

                {/* Label */}
                <div className="mt-1.5 px-0.5">
                  <p className="text-[11px] font-semibold truncate" style={{ color: isActive ? 'var(--text-0)' : 'var(--text-1)' }}>
                    {slot.label}
                  </p>
                  <p className="text-[9px] truncate" style={{ color: 'var(--text-3)', maxWidth: 170 }}>
                    {slot.url ? slot.url : slot.sublabel}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Add RTSP camera button */}
          <div
            className="flex-shrink-0 cursor-pointer"
            style={{ width: 180 }}
            onClick={() => { setAddRtspModal(true); setUrlInput(''); setNewCamLabel(''); }}
          >
            <div
              className="rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
              style={{
                height: 108,
                border: '2px dashed var(--border-1)',
                background: 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,130,246,0.40)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-1)'}
            >
              <svg className="w-6 h-6" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Active source stop bar */}
        {activeSlotKey && (
          <div
            className="flex items-center justify-between px-4 py-2 rounded-xl mb-3"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}
          >
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-1)' }}>
              <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
              <span className="font-semibold">
                {slots.find(s => s.key === activeSlotKey)?.label ?? 'Camera'} — Active
              </span>
              {stats.engagement > 0 && (
                <span className="font-mono font-bold ml-2" style={{ color: engColor }}>
                  {stats.engagement}% engagement
                </span>
              )}
            </div>
            <button
              onClick={stopActive}
              className="px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors"
              style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
            >
              Stop Feed
            </button>
          </div>
        )}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────── */}
      <div className="flex-1 px-5 pb-5 flex flex-col gap-4 min-h-0 overflow-auto">

        {/* Row 1: video feed + right panel */}
        <div className="flex flex-col xl:flex-row gap-4" style={{ minHeight: 420 }}>

          {/* Main video */}
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

          {/* Right column */}
          <div className="xl:w-[280px] flex flex-col gap-3 shrink-0">
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Engagement',  val: stats.engagement ? `${stats.engagement}%` : '—', color: engColor, active: !!stats.engagement },
                { label: 'Headcount',   val: stats.headcount  ? `${stats.headcount}/${ROOM_CAPACITY}` : '—', color: 'var(--brand)', active: !!stats.headcount },
                { label: 'Attention',   val: stats.attentionRate != null ? `${stats.attentionRate}%` : '—', color: 'var(--warning)', active: stats.attentionRate != null },
                { label: 'Lecturer',    val: stats.lecturerPresent ? 'Present' : '—', color: 'var(--success)', active: stats.lecturerPresent },
              ].map(m => (
                <div key={m.label} className="rounded-xl p-3 flex flex-col"
                     style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-2)' }}>
                    {m.label}
                  </span>
                  <span className="text-lg font-bold leading-none" style={{ color: m.active ? m.color : 'var(--text-3)' }}>
                    {m.val}
                  </span>
                </div>
              ))}
            </div>

            {/* Sentiment */}
            <div className="rounded-xl p-3"
                 style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                Class Sentiment
              </span>
              <p className="text-base font-bold mt-1 capitalize" style={{ color: 'var(--text-0)' }}>
                {stats.sentiment}
              </p>
            </div>

            {/* Session panel */}
            <div className="flex-1 min-h-0">
              <SessionPanel
                currentSession={currentSession}
                roomId={ROOM_ID}
                onSessionStart={setCurrentSession}
                onSessionEnd={() => setCurrentSession(null)}
              />
            </div>
          </div>
        </div>

        {/* Row 2: charts + alert log */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-1">
            <EngagementChart data={engHistory} sessionDuration={sessionDuration} />
          </div>
          <div className="xl:col-span-1">
            <GestureBreakdown gestures={lastGestures} />
          </div>
          <div className="xl:col-span-1">
            <AlertLog roomId={ROOM_ID} sessionId={currentSession?.id} />
          </div>
        </div>

      </div>

      {/* ── Hidden file input for upload slot ──────────────────── */}
      <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelected} />

      {/* ── URL modal (configure / edit RTSP URL) ─────────────── */}
      {urlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-0)' }}>
              Configure RTSP Camera
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Enter the RTSP or IP camera stream URL. The backend captures frames server-side.
            </p>
            <div
              className="mb-4 px-3 py-2 rounded-xl text-[11px] font-mono"
              style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', color: 'var(--success)' }}
            >
              ✓ Full AI analysis runs server-side — results stream via SSE
            </div>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRtspUrl()}
              placeholder="rtsp://192.168.1.100:554/stream"
              className="field font-mono text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setUrlModal(null); setUrlInput(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>
                Cancel
              </button>
              <button onClick={confirmRtspUrl}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-semibold transition-colors">
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add new RTSP camera modal ──────────────────────────── */}
      {addRtspModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl fade-up"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}
          >
            <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-0)' }}>
              Add RTSP Camera
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              Add a new IP or RTSP camera to the monitoring strip.
            </p>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>
                  Camera Label
                </label>
                <input
                  type="text"
                  value={newCamLabel}
                  onChange={e => setNewCamLabel(e.target.value)}
                  placeholder="e.g. Lab Entrance"
                  className="field text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>
                  RTSP URL
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addRtspSlot()}
                  placeholder="rtsp://192.168.1.100:554/stream"
                  className="field font-mono text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setAddRtspModal(false); setUrlInput(''); setNewCamLabel(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>
                Cancel
              </button>
              <button onClick={addRtspSlot}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-semibold transition-colors">
                Add Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
