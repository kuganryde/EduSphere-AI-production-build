import { useEffect, useRef } from 'react';
import { AnalysisUpdate, AlertRecord, Session } from '../types';

// ── Deterministic seeded pseudo-random ─────────────────────────────────────
function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 43758.5453;
  return x - Math.floor(x);
}

// ── Constants ───────────────────────────────────────────────────────────────
const ROOM_ID    = 'room-402-b';
const ROOM_CAP   = 34;
const TICK_CYCLE = 36; // ticks per full scenario loop

const PEDAGOGICAL_NOTES = [
  'Students show high engagement — excellent moment for Socratic questioning.',
  'Mild attention drop observed — consider a brief interactive activity.',
  'Dominant neutral emotion suggests passive reception — try think-pair-share.',
  'Energy levels are high — good moment to introduce challenging material.',
  'Some distraction detected — a short formative quiz may re-engage learners.',
  'Students appear attentive and positive — optimal learning conditions.',
  'Attention declining — recommend a 2-minute break or change of activity.',
  'Surprise spike detected — students may have encountered a new key concept.',
  'Emotional tone is mixed — check if the pace matches student readiness.',
  'High hands-raised count — leverage peer-to-peer explanation opportunities.',
  'Low engagement window — strong transition cue to a new topic or media.',
  'Class is energised and focused — ideal window for group problem-solving.',
];

interface PhaseSpec {
  engBase: number;
  headcount: number;
  emotions: Record<string, number>;
  lecturerPresent: boolean;
  alert: 'high_distraction' | 'low_attendance' | 'lecturer_absent' | null;
  sentiment: string;
  handsRaised: number;
  writingNotes: number;
  usingPhone: number;
}

const PHASES: PhaseSpec[] = [
  // 0: Settling in (t 0–5)
  {
    engBase: 62, headcount: 18,
    emotions: { neutral: 48, happy: 25, surprise: 8, sad: 12, angry: 4, fear: 2, disgust: 1 },
    lecturerPresent: true, alert: null, sentiment: 'focused',
    handsRaised: 2, writingNotes: 5, usingPhone: 1,
  },
  // 1: Lecture active (t 6–11)
  {
    engBase: 81, headcount: 22,
    emotions: { happy: 43, neutral: 33, surprise: 12, sad: 6, angry: 3, fear: 2, disgust: 1 },
    lecturerPresent: true, alert: null, sentiment: 'energetic',
    handsRaised: 7, writingNotes: 14, usingPhone: 1,
  },
  // 2: Peak Q&A (t 12–17)
  {
    engBase: 89, headcount: 23,
    emotions: { happy: 52, neutral: 24, surprise: 17, sad: 3, angry: 2, fear: 1, disgust: 1 },
    lecturerPresent: true, alert: null, sentiment: 'energetic',
    handsRaised: 10, writingNotes: 16, usingPhone: 0,
  },
  // 3: Mid-class slump (t 18–23)
  {
    engBase: 55, headcount: 22,
    emotions: { neutral: 38, sad: 23, happy: 16, surprise: 8, angry: 9, fear: 4, disgust: 2 },
    lecturerPresent: true, alert: 'high_distraction', sentiment: 'distracted',
    handsRaised: 1, writingNotes: 6, usingPhone: 5,
  },
  // 4: Intervention / recovery (t 24–29)
  {
    engBase: 67, headcount: 22,
    emotions: { neutral: 37, happy: 30, sad: 14, surprise: 11, angry: 5, fear: 2, disgust: 1 },
    lecturerPresent: true, alert: null, sentiment: 'mixed',
    handsRaised: 4, writingNotes: 10, usingPhone: 2,
  },
  // 5: Late-class focus (t 30–35)
  {
    engBase: 76, headcount: 21,
    emotions: { happy: 38, neutral: 35, surprise: 11, sad: 9, angry: 4, fear: 2, disgust: 1 },
    lecturerPresent: true, alert: null, sentiment: 'focused',
    handsRaised: 5, writingNotes: 13, usingPhone: 1,
  },
];

// ── Core tick generator ─────────────────────────────────────────────────────
export interface MockTick {
  update: AnalysisUpdate;
  phaseIndex: number;
  tickIndex: number;
}

export function getMockTick(tickIndex: number): MockTick {
  const ti   = tickIndex % TICK_CYCLE;
  const phaseIndex = Math.floor(ti / (TICK_CYCLE / PHASES.length));
  const phase = PHASES[phaseIndex];
  const r = (offset: number) => sr(tickIndex * 31 + offset);

  // Engagement with smooth noise
  const noise   = (r(0) - 0.5) * 14;
  const engagement = Math.max(25, Math.min(100, Math.round(phase.engBase + noise)));

  // Headcount with slight variation
  const headcount = Math.max(1, Math.min(ROOM_CAP,
    phase.headcount + Math.round((r(1) - 0.5) * 3)));

  // Attention rate tracks engagement
  const attNoise     = (r(2) - 0.5) * 8;
  const attentionRate = Math.max(15, Math.min(100, Math.round(engagement + attNoise)));

  // Emotion breakdown with noise, normalised to 100
  const raw: Record<string, number> = {};
  const eKeys = Object.keys(phase.emotions);
  eKeys.forEach((k, i) => {
    raw[k] = Math.max(0, Math.round((phase.emotions[k] ?? 0) + (r(i + 3) - 0.5) * 8));
  });
  const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
  const emotionBreakdown: Record<string, number> = {};
  let remaining = 100;
  eKeys.forEach((k, i) => {
    const v = i === eKeys.length - 1 ? remaining : Math.round((raw[k] / total) * 100);
    emotionBreakdown[k] = Math.max(0, v);
    remaining -= emotionBreakdown[k];
  });

  // Dominant emotion
  const dominantEmotion = Object.entries(emotionBreakdown)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Per-face emotions: sample from breakdown
  const faceCount = Math.min(headcount, 8 + Math.floor(r(12) * 8));
  const faceEmotions = Array.from({ length: faceCount }, (_, i) => {
    const rand = r(i * 17 + 6) * 100;
    let cum = 0;
    let emotion = 'neutral';
    for (const [k, pct] of Object.entries(emotionBreakdown)) {
      cum += pct;
      if (rand <= cum) { emotion = k; break; }
    }
    return {
      emotion,
      attention: r(i * 7 + 2) < (attentionRate / 100),
      confidence: parseFloat((0.65 + r(i * 5 + 3) * 0.33).toFixed(2)),
    };
  });

  // Gestures
  const gestures = {
    hands_raised:    Math.max(0, phase.handsRaised + Math.round((r(20) - 0.5) * 3)),
    writing_notes:   Math.max(0, phase.writingNotes + Math.round((r(21) - 0.5) * 4)),
    using_phone:     Math.max(0, phase.usingPhone  + Math.round(r(22) * 2)),
    heads_down:      Math.max(0, Math.round(headcount * 0.08 + r(23) * 3)),
    looking_at_board:Math.max(0, Math.round(headcount * 0.55 + r(24) * 5)),
  };

  // Pedagogical note: rotates every 4 ticks
  const noteIndex = Math.floor(tickIndex / 4) % PEDAGOGICAL_NOTES.length;

  const update: AnalysisUpdate = {
    engagement,
    headcount,
    sentiment:       phase.sentiment,
    lecturerPresent: phase.lecturerPresent,
    gestures,
    alert:           phase.alert,
    attentionRate,
    timestamp:       new Date().toISOString(),
    emotionBreakdown,
    dominantEmotion,
    pedagogicalNote: PEDAGOGICAL_NOTES[noteIndex],
    faceEmotions,
  };

  return { update, phaseIndex, tickIndex };
}

// ── React hook: fires onTick every intervalMs when enabled ──────────────────
export function useMockStream(
  enabled: boolean,
  onTick: (tick: MockTick) => void,
  intervalMs = 3500,
): void {
  const tickRef  = useRef(0);
  const callbackRef = useRef(onTick);
  callbackRef.current = onTick;

  useEffect(() => {
    if (!enabled) { tickRef.current = 0; return; }

    // Emit tick 0 immediately
    callbackRef.current(getMockTick(0));
    tickRef.current = 1;

    const id = setInterval(() => {
      callbackRef.current(getMockTick(tickRef.current));
      tickRef.current++;
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}

// ── Mock alert generator ────────────────────────────────────────────────────
export function buildMockAlert(
  alertType: string,
  roomId: string,
  sessionId: string,
): AlertRecord {
  const messages: Record<string, { msg: string; level: 1 | 2 | 3 }> = {
    high_distraction: { msg: 'High distraction: 5 students using phones or off-task.', level: 2 },
    low_attendance:   { msg: 'Below-capacity attendance: 18/34 students present.',     level: 1 },
    lecturer_absent:  { msg: 'Lecturer not detected for >2 minutes.',                  level: 3 },
  };
  const meta = messages[alertType] ?? { msg: `Alert: ${alertType}`, level: 2 as const };
  return {
    id:          `demo-alert-${alertType}-${Date.now()}`,
    session_id:  sessionId,
    room_id:     roomId,
    level:       meta.level,
    message:     meta.msg,
    alert_type:  alertType,
    created_at:  new Date().toISOString(),
    dismissed_at: null,
  };
}

// ── Static mock session ─────────────────────────────────────────────────────
export function buildMockSession(): Session {
  return {
    id:                'demo-session-001',
    room_id:           ROOM_ID,
    lecturer_name:     'Dr. Sarah Chen',
    course_code:       'CS302',
    expected_capacity: ROOM_CAP,
    started_at:        new Date(Date.now() - 23 * 60_000).toISOString(),
    ended_at:          null,
    status:            'active',
  };
}
