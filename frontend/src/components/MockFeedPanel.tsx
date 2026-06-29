import { useState, useEffect, useRef } from 'react';

interface FaceEmotion {
  emotion: string;
  attention: boolean;
  confidence: number;
}

interface MockFeedPanelProps {
  faceEmotions: FaceEmotion[];
  headcount: number;
  engagement: number;
  isRunning: boolean;
}

// ── Seat layout: 22 occupied + 2 empty in a 3-row grid ─────────────────────
const SEAT_ROWS = [8, 8, 8];
const TOTAL_SEATS = SEAT_ROWS.reduce((s, n) => s + n, 0);
const OCCUPIED = 22;

const EMOTION_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  happy:   { color: '#10b981', bg: 'rgba(16,185,129,0.18)',   label: 'HAP' },
  neutral: { color: '#3b82f6', bg: 'rgba(59,130,246,0.18)',   label: 'NEU' },
  surprise:{ color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)',   label: 'SRP' },
  sad:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',   label: 'SAD' },
  angry:   { color: '#ef4444', bg: 'rgba(239,68,68,0.18)',    label: 'ANG' },
  fear:    { color: '#ec4899', bg: 'rgba(236,72,153,0.18)',   label: 'FEA' },
  disgust: { color: '#f97316', bg: 'rgba(249,115,22,0.18)',   label: 'DIS' },
};

function emotionCfg(emotion: string) {
  return EMOTION_CONFIG[emotion] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.18)', label: '???' };
}

// ── FPS counter that fluctuates naturally ───────────────────────────────────
function useFpsTicker(running: boolean) {
  const [fps, setFps]   = useState(28);
  const [fc, setFc]     = useState(0);
  const [ts, setTs]     = useState('');

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setFps(28 + Math.floor(Math.random() * 5));
      setFc(prev => (prev + 28 + Math.floor(Math.random() * 5)) & 0xfffff);
      setTs(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return { fps, fc, ts };
}

// ── Scanline animation ──────────────────────────────────────────────────────
function ScanLine() {
  return (
    <div
      className="absolute inset-x-0 pointer-events-none z-20"
      style={{
        height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.35), transparent)',
        animation: 'scan-vertical 4s linear infinite',
        top: 0,
      }}
    />
  );
}

// ── Individual seat card ────────────────────────────────────────────────────
function SeatCard({
  index,
  emotion,
  attention,
  confidence,
  occupied,
}: {
  index: number;
  emotion: string;
  attention: boolean;
  confidence: number;
  occupied: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  if (!occupied) {
    return (
      <div
        className="rounded-lg"
        style={{ width: 52, height: 56, border: '1px dashed rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
      />
    );
  }

  const cfg = emotionCfg(emotion);

  return (
    <div
      className="relative rounded-lg cursor-default transition-all duration-300"
      style={{
        width: 52,
        height: 56,
        background: cfg.bg,
        border: `1px solid ${attention ? cfg.color + 'aa' : cfg.color + '44'}`,
        boxShadow: attention ? `0 0 8px ${cfg.color}33` : 'none',
        transform: hovered ? 'scale(1.06)' : 'scale(1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar circle */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full flex items-center justify-center"
        style={{ width: 26, height: 26, background: cfg.color + '30', border: `1.5px solid ${cfg.color}88` }}
      >
        <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={cfg.color} strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      {/* Emotion label */}
      <div
        className="absolute bottom-1.5 inset-x-1 flex items-center justify-center"
        style={{ fontSize: 8, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.04em', color: cfg.color }}
      >
        {cfg.label}
      </div>

      {/* Attention dot */}
      <div
        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
        style={{ background: attention ? '#10b981' : '#ef4444', boxShadow: attention ? '0 0 4px #10b981' : 'none' }}
      />

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg text-[9px] font-mono whitespace-nowrap"
          style={{ background: 'rgba(4,8,15,0.95)', border: '1px solid rgba(255,255,255,0.12)', color: cfg.color }}
        >
          S{index + 1} · {emotion} · {Math.round(confidence * 100)}%
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function MockFeedPanel({ faceEmotions, headcount, engagement, isRunning }: MockFeedPanelProps) {
  const { fps, fc, ts } = useFpsTicker(isRunning);
  const scanRef = useRef(0);
  const [scanPct, setScanPct] = useState(0);

  // Animate scan line independently
  useEffect(() => {
    if (!isRunning) return;
    let raf: number;
    let start = performance.now();
    const PERIOD = 4000;
    const tick = (now: number) => {
      setScanPct(((now - start) % PERIOD) / PERIOD);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isRunning]);

  // Build seat → emotion mapping
  const seats: Array<{ emotion: string; attention: boolean; confidence: number }> = [];
  for (let i = 0; i < OCCUPIED; i++) {
    if (i < faceEmotions.length) {
      seats.push(faceEmotions[i]);
    } else {
      seats.push({ emotion: 'neutral', attention: true, confidence: 0.8 });
    }
  }

  const engColor = engagement > 79 ? '#10b981' : engagement > 49 ? '#f59e0b' : '#ef4444';
  const attentiveCount = seats.filter(s => s.attention).length;

  return (
    <div
      className="w-full rounded-2xl relative overflow-hidden flex flex-col"
      style={{ background: '#060c14', border: '1px solid var(--border-0)', minHeight: 340, flex: 1 }}
    >
      {/* ── Camera HUD header ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2 shrink-0"
        style={{ background: 'rgba(0,0,0,0.55)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#f59e0b' }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
            Demo Feed
          </span>
        </div>
        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.12)' }} />
        <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Room 402-B · 640×480 · {fps} FPS
        </span>
        <div className="flex-1" />
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.22)' }}>
          #{fc.toString(16).padStart(5, '0').toUpperCase()} · {ts}
        </span>
      </div>

      {/* ── Scan line ──────────────────────────────────────────── */}
      <div
        className="absolute inset-x-0 pointer-events-none z-20"
        style={{
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.4) 50%, transparent 100%)',
          top: `${scanPct * 100}%`,
          transition: 'top 0.05s linear',
        }}
      />

      {/* ── Classroom grid ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-5 relative">

        {/* Row labels + seat grids */}
        {SEAT_ROWS.map((rowLen, rowIdx) => {
          const startIndex = SEAT_ROWS.slice(0, rowIdx).reduce((s, n) => s + n, 0);
          return (
            <div key={rowIdx} className="flex items-center gap-2">
              <span
                className="text-[8px] font-mono shrink-0 w-8 text-right"
                style={{ color: 'rgba(255,255,255,0.18)' }}
              >
                R{rowIdx + 1}
              </span>
              <div className="flex gap-2 flex-wrap justify-center">
                {Array.from({ length: rowLen }, (_, colIdx) => {
                  const seatIndex = startIndex + colIdx;
                  const occupied  = seatIndex < OCCUPIED;
                  const face      = occupied && seatIndex < seats.length ? seats[seatIndex] : null;
                  return (
                    <SeatCard
                      key={colIdx}
                      index={seatIndex}
                      emotion={face?.emotion ?? 'neutral'}
                      attention={face?.attention ?? false}
                      confidence={face?.confidence ?? 0.7}
                      occupied={occupied}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Lecturer area */}
        <div className="mt-1 flex items-center gap-3">
          <div className="w-20 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div
            className="px-3 py-1.5 rounded-lg flex items-center gap-2"
            style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.35)' }}
          >
            <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[9px] font-semibold" style={{ color: '#60a5fa' }}>
              Lecturer · Dr. Sarah Chen
            </span>
            <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#10b981' }} />
          </div>
          <div className="w-20 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Engagement mini-bar overlay */}
        <div
          className="absolute top-3 right-3 flex flex-col items-end gap-1"
          style={{ minWidth: 80 }}
        >
          <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ENGAGEMENT
          </span>
          <div
            className="rounded-full overflow-hidden"
            style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${engagement}%`, background: engColor }}
            />
          </div>
          <span className="text-[10px] font-bold font-mono" style={{ color: engColor }}>
            {engagement}%
          </span>
        </div>

        {/* Headcount badge overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <svg width={10} height={10} fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.5)" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {headcount}
            </span>
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
            style={{ background: 'rgba(0,0,0,0.60)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="w-1 h-1 rounded-full" style={{ background: '#10b981' }} />
            <span className="text-[9px] font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {attentiveCount}/{seats.length} attn
            </span>
          </div>
        </div>

        {/* Detection count badge */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <div className="px-2 py-1 rounded-md" style={{ background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.45)' }}>
            <span className="text-[8px] font-bold text-blue-400 font-mono">{headcount} bodies</span>
          </div>
          <div className="px-2 py-1 rounded-md" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.40)' }}>
              {faceEmotions.length} faces
            </span>
          </div>
        </div>
      </div>

      {/* ── Status bar ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2 shrink-0 flex-wrap"
        style={{ background: 'rgba(0,0,0,0.55)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Simulated · Gemini 2.0 Flash · HSEmotion B2 · YOLOv11n-pose · YOLO-World
        </span>
        <div className="flex-1" />
        <span className="text-[8px] font-bold font-mono uppercase tracking-widest px-2 py-0.5 rounded"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.30)' }}>
          DEMO
        </span>
      </div>
    </div>
  );
}
