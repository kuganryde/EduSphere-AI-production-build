import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PedagogicalAnalysis } from '../types';

interface GestureBreakdownProps {
  gestures?: PedagogicalAnalysis['gestures'] | null;
}

const COLORS = {
  writing_notes:    { color: '#10b981', label: 'Writing' },
  looking_at_board: { color: '#8b5cf6', label: 'Board' },
  hands_raised:     { color: '#3b82f6', label: 'Hands Raised' },
  using_phone:      { color: '#ef4444', label: 'Phone' },
  heads_down:       { color: '#eab308', label: 'Heads Down' },
};

export default function GestureBreakdown({ gestures }: GestureBreakdownProps) {
  const data = gestures
    ? Object.entries(COLORS)
        .map(([key, meta]) => ({
          name: meta.label,
          value: gestures[key as keyof typeof gestures] ?? 0,
          color: meta.color,
        }))
        .filter(d => d.value > 0)
    : [];

  const hasData = data.length > 0;

  return (
    <div
      className="p-5 rounded-2xl flex flex-col h-full min-h-[280px] w-full transition-theme"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
    >
      <h3 className="text-sm font-semibold mb-2 shrink-0" style={{ color: 'var(--text-0)' }}>
        Gesture Breakdown
      </h3>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <svg className="w-10 h-10" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
          </svg>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            Gesture data appears after first AI analysis
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                stroke="var(--surface-2)"
                strokeWidth={3}
                paddingAngle={2}
              >
                {data.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  boxShadow: 'var(--shadow-md)',
                }}
                itemStyle={{ color: 'var(--text-0)', fontSize: '13px', fontWeight: 600 }}
                formatter={(value: number) => [`${value}`, '']}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: 'var(--text-2)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
