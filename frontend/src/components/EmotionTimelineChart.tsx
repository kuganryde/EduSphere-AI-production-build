/**
 * EmotionTimelineChart
 * Recharts LineChart showing per-emotion percentage over session duration.
 * 7 lines (one per emotion), each with its canonical color.
 */
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { EmotionTimelinePoint } from '../types';

interface EmotionTimelineChartProps {
  data: EmotionTimelinePoint[];
}

/** Canonical emotion configuration (consistent with LiveEmotionPanel and AnalyticsPage) */
const EMOTIONS: Array<{ key: keyof EmotionTimelinePoint; label: string; color: string }> = [
  { key: 'happy',    label: 'Happy',    color: '#10b981' },
  { key: 'neutral',  label: 'Neutral',  color: '#3b82f6' },
  { key: 'surprise', label: 'Surprise', color: '#8b5cf6' },
  { key: 'sad',      label: 'Sad',      color: '#f59e0b' },
  { key: 'angry',    label: 'Angry',    color: '#ef4444' },
  { key: 'fear',     label: 'Fear',     color: '#ec4899' },
  { key: 'disgust',  label: 'Disgust',  color: '#f97316' },
];

/** Custom tooltip styled with CSS variables */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-1)',
        borderRadius: 10,
        padding: '8px 12px',
        boxShadow: 'var(--shadow-md)',
        fontSize: 11,
        color: 'var(--text-0)',
        minWidth: 130,
      }}
    >
      <p style={{ color: 'var(--text-2)', fontSize: 9, marginBottom: 6, fontFamily: 'monospace' }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600, margin: '2px 0' }}>
          {p.name}: {p.value}%
        </p>
      ))}
    </div>
  );
}

/** Custom legend renderer — small colored dots with labels */
function ChartLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 14px',
        justifyContent: 'center',
        paddingTop: 8,
      }}
    >
      {payload.map((entry: any) => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-2)', textTransform: 'capitalize' }}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function EmotionTimelineChart({ data }: EmotionTimelineChartProps) {
  return (
    <div
      className="rounded-2xl transition-theme"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-0)',
        boxShadow: 'var(--shadow-sm)',
        padding: '16px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-0)',
              margin: 0,
            }}
          >
            Emotion Timeline
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-2)', margin: '2px 0 0' }}>
            Per-emotion % over session duration
          </p>
        </div>
        {data.length > 0 && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 999,
              background: 'var(--brand-dim)',
              border: '1px solid rgba(59,130,246,0.20)',
              color: 'var(--brand)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {data.length} points
          </span>
        )}
      </div>

      {/* Empty state */}
      {data.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textAlign: 'center',
          }}
        >
          <svg
            width={32}
            height={32}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--text-3)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
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
            No timeline data
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            Analysis data will appear here during a live session
          </span>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-0)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--border-1)"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--text-2)' }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--border-1)"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tick={{ fill: 'var(--text-2)' }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend content={<ChartLegend />} />
              {EMOTIONS.map(({ key, label, color }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key as string}
                  name={label}
                  stroke={color}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
