/**
 * LiveEmotionPanel
 * Displays real-time emotion breakdown bars, dominant emotion badge,
 * per-face emotion chips, and Gemini pedagogical note.
 */

interface LiveEmotionPanelProps {
  emotionBreakdown: Record<string, number> | null;
  dominantEmotion: string | null;
  pedagogicalNote: string | null;
  faceEmotions: Array<{ emotion: string; attention: boolean; confidence: number }>;
  isLive: boolean;
}

/** Canonical emotion order and colors (consistent across all charts) */
const EMOTIONS: Array<{ key: string; label: string; color: string }> = [
  { key: 'happy',    label: 'Happy',    color: '#10b981' },
  { key: 'neutral',  label: 'Neutral',  color: '#3b82f6' },
  { key: 'surprise', label: 'Surprise', color: '#8b5cf6' },
  { key: 'sad',      label: 'Sad',      color: '#f59e0b' },
  { key: 'angry',    label: 'Angry',    color: '#ef4444' },
  { key: 'fear',     label: 'Fear',     color: '#ec4899' },
  { key: 'disgust',  label: 'Disgust',  color: '#f97316' },
];

function emotionColor(key: string): string {
  return EMOTIONS.find(e => e.key === key)?.color ?? 'var(--text-3)';
}

export default function LiveEmotionPanel({
  emotionBreakdown,
  dominantEmotion,
  pedagogicalNote,
  faceEmotions,
  isLive,
}: LiveEmotionPanelProps) {
  const hasData = !!emotionBreakdown && Object.keys(emotionBreakdown).length > 0;

  return (
    <div
      className="rounded-2xl transition-theme"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-0)',
        boxShadow: 'var(--shadow-sm)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLive && (
            <span
              className="live-dot"
              style={{
                display: 'inline-block',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--success)',
                flexShrink: 0,
              }}
            />
          )}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-2)',
            }}
          >
            Live Emotion Analysis
          </span>
        </div>
        {dominantEmotion && hasData && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '2px 10px',
              borderRadius: 999,
              background: emotionColor(dominantEmotion) + '22',
              border: `1px solid ${emotionColor(dominantEmotion)}55`,
              color: emotionColor(dominantEmotion),
              textTransform: 'capitalize',
              letterSpacing: '0.04em',
            }}
          >
            {dominantEmotion}
          </span>
        )}
      </div>

      {/* No-data empty state */}
      {!hasData && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '20px 0',
            textAlign: 'center',
          }}
        >
          <svg
            width={28}
            height={28}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--text-3)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              fontFamily: 'monospace',
            }}
          >
            No emotion data yet
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Start a live feed to see emotion breakdown
          </span>
        </div>
      )}

      {/* Emotion breakdown bars */}
      {hasData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {EMOTIONS.map(({ key, label, color }) => {
            const value = emotionBreakdown?.[key] ?? 0;
            const isDominant = dominantEmotion === key;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Label */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: isDominant ? 700 : 500,
                    width: 46,
                    flexShrink: 0,
                    color: value > 0 ? 'var(--text-1)' : 'var(--text-3)',
                    textTransform: 'capitalize',
                    letterSpacing: '0.02em',
                  }}
                >
                  {label}
                </span>
                {/* Bar track */}
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: 'var(--surface-3)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(value, 0)}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: value > 0 ? color : 'var(--border-0)',
                      transition: 'width 0.5s ease',
                      opacity: value > 0 ? 1 : 0.4,
                    }}
                  />
                </div>
                {/* Percentage */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    width: 30,
                    textAlign: 'right',
                    flexShrink: 0,
                    color: value > 0 ? color : 'var(--text-3)',
                  }}
                >
                  {value > 0 ? `${value}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-face emotion chips */}
      {faceEmotions.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--text-2)',
              marginBottom: 6,
            }}
          >
            Per-Face Emotions
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {faceEmotions.map((face, i) => {
              const fc = emotionColor(face.emotion);
              return (
                <div
                  key={i}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: fc + '18',
                    border: `1px solid ${fc}44`,
                    fontSize: 9,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                  }}
                >
                  {/* Emotion color dot */}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: fc,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>
                    Face {i + 1} · {face.emotion}
                  </span>
                  {/* Attention indicator */}
                  <span
                    style={{
                      color: face.attention ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 700,
                    }}
                  >
                    {face.attention ? '✓' : '✗'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pedagogical note from Gemini */}
      {pedagogicalNote && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: 'var(--surface-3)',
            border: '1px solid var(--border-0)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          {/* Lightbulb icon */}
          <svg
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <p
            style={{
              fontSize: 10,
              lineHeight: 1.5,
              color: 'var(--text-1)',
              margin: 0,
            }}
          >
            {pedagogicalNote}
          </p>
        </div>
      )}
    </div>
  );
}
