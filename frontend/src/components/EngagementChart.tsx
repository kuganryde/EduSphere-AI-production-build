import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DataPoint { time: string; focus: number; attention: number }

interface EngagementChartProps {
  data?: DataPoint[];
  sessionDuration?: string;
}

export default function EngagementChart({ data = [], sessionDuration }: EngagementChartProps) {
  const hasData = data.length > 0;

  return (
    <div
      className="p-5 rounded-2xl flex flex-col h-full min-h-[280px] w-full transition-theme"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>Engagement Timeline</h3>
        <span
          className="text-[9px] font-mono px-2 py-1 rounded border"
          style={{ background: 'var(--surface-3)', color: 'var(--text-2)', borderColor: 'var(--border-1)' }}
        >
          {sessionDuration ? `Session: ${sessionDuration}` : 'No Session'}
        </span>
      </div>

      {!hasData ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
          <svg className="w-10 h-10" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
            Start a session and connect a camera to see live data
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full relative -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.30} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAttention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-0)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                     dy={10} tick={{ fill: 'var(--text-2)' }} />
              <YAxis stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                     dx={-10} domain={[0, 100]} tick={{ fill: 'var(--text-2)' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border-1)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  boxShadow: 'var(--shadow-md)',
                }}
                itemStyle={{ color: 'var(--text-0)', fontSize: '12px', fontWeight: 500 }}
                labelStyle={{ color: 'var(--text-2)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}
              />
              <Area type="monotone" dataKey="focus"     name="Engagement" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorFocus)" />
              <Area type="monotone" dataKey="attention" name="Attention"   stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorAttention)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded" />
          <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>Engagement</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded" />
          <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>Attention</span>
        </div>
        {hasData && (
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-3)' }}>
            {data.length} readings
          </span>
        )}
      </div>
    </div>
  );
}
