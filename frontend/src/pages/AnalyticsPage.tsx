import { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell,
} from 'recharts';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface TrendDay { date: string; averageEngagement: number }
interface RoomSummary {
  roomId: string; name: string; status: string;
  engagement: number; headcount: number; capacity: number;
}

/** Canonical emotion colors — consistent across all components */
const EMOTION_COLORS: Record<string, string> = {
  happy:    '#10b981',
  neutral:  '#3b82f6',
  surprise: '#8b5cf6',
  sad:      '#f59e0b',
  angry:    '#ef4444',
  fear:     '#ec4899',
  disgust:  '#f97316',
};

/** Ordered emotion keys for consistent display */
const EMOTION_ORDER = ['happy', 'neutral', 'surprise', 'sad', 'angry', 'fear', 'disgust'];

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 shadow-xl text-xs"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-1)',
        color: 'var(--text-0)',
      }}
    >
      <p className="mb-1" style={{ color: 'var(--text-2)', fontSize: 10 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-semibold text-blue-400">
          {p.value}{p.unit ?? '%'}
        </p>
      ))}
    </div>
  );
};

function EngagementScore({ value }: { value: number }) {
  const color = value > 79 ? 'var(--success)' : value > 49 ? 'var(--warning)' : value > 0 ? 'var(--danger)' : 'var(--text-3)';
  return <span style={{ color, fontWeight: 700 }}>{value > 0 ? `${value}%` : '—'}</span>;
}

/* ── Sub-tab components ────────────────────────────────────────────────────── */

function StudentTab({ emotionBreakdown, emotionSessionLabel }: {
  emotionBreakdown: Record<string, number> | null;
  emotionSessionLabel: string | null;
}) {
  return (
    <div className="flex-1 p-5 flex flex-col gap-5 overflow-auto">
      <div
        className="rounded-2xl p-5 transition-theme"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>Student Emotion Distribution</h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>
              {emotionSessionLabel
                ? `Average emotion distribution — ${emotionSessionLabel}`
                : 'Average emotion distribution from the most recent session'}
            </p>
          </div>
          {emotionBreakdown && (
            <span
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: 'var(--success-dim)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.20)' }}
            >
              Latest Session
            </span>
          )}
        </div>
        {!emotionBreakdown ? (
          <div className="h-40 flex flex-col items-center justify-center gap-3 text-center">
            <svg className="w-9 h-9" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              No emotion data yet — complete a session with DeepFace analysis enabled
            </p>
          </div>
        ) : (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={EMOTION_ORDER.map(e => ({ emotion: e, value: emotionBreakdown[e] ?? 0 }))}
                margin={{ top: 2, right: 12, left: 52, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-0)" horizontal={false} />
                <XAxis
                  type="number" domain={[0, 100]}
                  stroke="var(--border-1)" fontSize={9} tickLine={false} axisLine={false}
                  tick={{ fill: 'var(--text-2)' }} tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category" dataKey="emotion"
                  stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                  tick={{ fill: 'var(--text-1)', fontWeight: 600 }} width={50}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Avg %']}
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 10, fontSize: 11, color: 'var(--text-0)' }}
                  cursor={{ fill: 'var(--border-0)', opacity: 0.5 }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {EMOTION_ORDER.map(e => (
                    <Cell key={e} fill={EMOTION_COLORS[e] ?? '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function LecturerTab({ rooms }: { rooms: { roomId: string; name: string; status: string; engagement: number; headcount: number; capacity: number }[] }) {
  return (
    <div className="flex-1 p-5 flex flex-col gap-5 overflow-auto">
      <div
        className="rounded-2xl overflow-hidden transition-theme"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-0)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>Lecturer Room Presence</h2>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>Current status across all configured rooms</p>
          </div>
          <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>{rooms.length} room{rooms.length !== 1 ? 's' : ''}</span>
        </div>
        {rooms.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs" style={{ color: 'var(--text-3)' }}>No rooms configured</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-0)' }}>
                  {['Room', 'Status', 'Engagement', 'Headcount', 'Capacity'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => (
                  <tr key={room.roomId}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--border-0)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-0)' }}>{room.name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                        room.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-500/25' : 'bg-gray-800/50 text-gray-500 border-gray-700/50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'active' ? 'bg-green-400 live-dot' : 'bg-gray-600'}`} />
                        {room.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><EngagementScore value={room.engagement} /></td>
                    <td className="px-5 py-3.5 font-mono" style={{ color: 'var(--text-1)' }}>{room.headcount || '—'}</td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--text-2)' }}>{room.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AIInsightsTab({ trends }: { trends: { date: string; averageEngagement: number }[] }) {
  const avgEngagement = trends.length
    ? Math.round(trends.reduce((s, d) => s + d.averageEngagement, 0) / trends.length) : 0;
  const trend = trends.length > 1
    ? trends[trends.length - 1].averageEngagement - trends[0].averageEngagement
    : 0;

  const insights = [
    {
      title: 'Engagement Trajectory',
      body: avgEngagement > 70
        ? `Strong average engagement of ${avgEngagement}% over the last ${trends.length} days. Class is consistently attentive.`
        : avgEngagement > 40
        ? `Moderate engagement of ${avgEngagement}% detected. Consider interactive teaching methods to boost participation.`
        : trends.length === 0
        ? 'No session data available yet. Start a monitoring session to generate AI insights.'
        : `Low engagement of ${avgEngagement}% detected. Review session recordings and consider curriculum adjustments.`,
      icon: '📊',
    },
    {
      title: 'Trend Analysis',
      body: trend > 5
        ? `Engagement is improving (+${Math.round(trend)}% over the period). Recent teaching strategies appear effective.`
        : trend < -5
        ? `Engagement is declining (${Math.round(trend)}% over the period). Consider introducing new engagement techniques.`
        : trends.length < 2
        ? 'Insufficient data for trend analysis. Run at least two sessions to generate trend insights.'
        : 'Engagement is stable. Maintain current strategies and monitor for changes.',
      icon: '📈',
    },
    {
      title: 'Recommendation',
      body: avgEngagement < 50 && trends.length > 0
        ? 'Consider breaking lectures into shorter segments with interactive Q&A sessions to improve student focus.'
        : avgEngagement >= 75
        ? 'Excellent engagement levels. Document successful teaching patterns for replication across sessions.'
        : 'Engagement is in an acceptable range. Monitor emotion breakdowns in the Student Emotions tab for deeper insights.',
      icon: '💡',
    },
  ];

  return (
    <div className="flex-1 p-5 flex flex-col gap-4 overflow-auto">
      {insights.map(ins => (
        <div key={ins.title} className="e-card rounded-2xl p-5 transition-theme"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span style={{ fontSize: 22 }}>{ins.icon}</span>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>{ins.title}</h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{ins.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage({ tab = 'classroom' }: { tab?: 'classroom' | 'student' | 'lecturer' | 'ai' }) {
  const [trends, setTrends]   = useState<TrendDay[]>([]);
  const [rooms, setRooms]     = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  // Latest session emotion breakdown
  const [emotionBreakdown, setEmotionBreakdown] = useState<Record<string, number> | null>(null);
  const [emotionSessionLabel, setEmotionSessionLabel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'classroom' | 'student' | 'lecturer' | 'ai'>(tab);
  useEffect(() => { setActiveTab(tab); }, [tab]);

  useEffect(() => {
    const h = getAuthHeader();
    Promise.all([
      fetch(`${API_URL}/analytics/trends`, { headers: h }).then(r => r.json()),
      fetch(`${API_URL}/analytics/rooms/summary`, { headers: h }).then(r => r.json()),
    ]).then(([t, r]) => {
      setTrends(t.days ?? []);
      setRooms(Array.isArray(r) ? r : []);
    }).catch(console.error).finally(() => setLoading(false));

    // Fetch most recent session and its emotion breakdown
    fetch(`${API_URL}/sessions?limit=1`, { headers: h })
      .then(r => r.ok ? r.json() : [])
      .then((sessions: any[]) => {
        const latest = Array.isArray(sessions) ? sessions[0] : null;
        if (!latest?.id) return;
        const label = latest.course_code
          ? `${latest.course_code} — ${new Date(latest.started_at).toLocaleDateString()}`
          : new Date(latest.started_at).toLocaleDateString();
        setEmotionSessionLabel(label);
        return fetch(`${API_URL}/analytics/${latest.id}`, { headers: h }).then(r => r.json());
      })
      .then((analytics: any) => {
        if (analytics?.avgEmotionBreakdown && Object.keys(analytics.avgEmotionBreakdown).length > 0) {
          setEmotionBreakdown(analytics.avgEmotionBreakdown);
        }
      })
      .catch(() => {});
  }, []);

  const avgEngagement = trends.length
    ? Math.round(trends.reduce((s, d) => s + d.averageEngagement, 0) / trends.length) : 0;
  const activeRooms = rooms.filter(r => r.status === 'active').length;

  const kpis = [
    {
      label: 'Avg Engagement', value: `${avgEngagement}%`,
      sub: '7-day average', color: 'var(--brand)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Active Rooms', value: activeRooms,
      sub: 'Currently live', color: 'var(--success)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 10l4.553-2.069A1 1 0 0121 8.847v6.306a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
      ),
    },
    {
      label: 'Total Rooms', value: rooms.length,
      sub: 'Configured', color: 'var(--text-0)',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      label: 'Data Points', value: trends.length,
      sub: 'Daily samples', color: '#a78bfa',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col min-h-full transition-theme" style={{ background: 'var(--surface-0)' }}>
      {/* Page header */}
      <div
        className="px-6 pt-5 pb-4"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-0)' }}
      >
        <div className="flex items-center gap-3">
          <div className="page-header-icon">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text-0)' }}>
              Detailed Analytics
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
              7-day engagement trends and room performance overview
            </p>
          </div>
        </div>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {([
            { id: 'classroom', label: 'Classroom Overview' },
            { id: 'student',   label: 'Student Emotions'   },
            { id: 'lecturer',  label: 'Lecturer Analysis'  },
            { id: 'ai',        label: 'AI Insights'        },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === t.id ? 'var(--brand)' : 'var(--surface-3)',
                color: activeTab === t.id ? '#fff' : 'var(--text-2)',
                border: activeTab === t.id ? '1px solid var(--brand)' : '1px solid var(--border-0)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Classroom tab */}
      {activeTab === 'classroom' && (
        <div className="flex-1 p-5 flex flex-col gap-5 overflow-auto">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* KPI cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {kpis.map(kpi => (
                  <div
                    key={kpi.label}
                    className="rounded-2xl p-4 transition-theme"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-0)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
                        {kpi.label}
                      </p>
                      <span style={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</span>
                    </div>
                    <p className="text-3xl font-bold leading-none mb-1" style={{ color: kpi.color }}>
                      {kpi.value}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* 7-day trend */}
              <div
                className="rounded-2xl p-5 transition-theme"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>Engagement Trend</h2>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                      Daily average across all sessions
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: 'var(--brand-dim)', color: 'var(--brand)', border: '1px solid rgba(59,130,246,0.20)' }}
                  >
                    7 Days
                  </span>
                </div>

                {trends.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center gap-3 text-center">
                    <svg className="w-10 h-10" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                      No trend data yet — start a session to generate data
                    </p>
                  </div>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-0)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                               tick={{ fill: 'var(--text-2)' }} />
                        <YAxis stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                               domain={[0, 100]} tick={{ fill: 'var(--text-2)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="averageEngagement" stroke="#3b82f6" strokeWidth={2} fill="url(#engGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Room bar chart */}
              {rooms.length > 0 && (
                <div
                  className="rounded-2xl p-5 transition-theme"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div className="mb-5">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>
                      Room Engagement Snapshot
                    </h2>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-2)' }}>
                      Latest engagement reading per room
                    </p>
                  </div>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rooms} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-0)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                               tick={{ fill: 'var(--text-2)' }} />
                        <YAxis stroke="var(--border-1)" fontSize={10} tickLine={false} axisLine={false}
                               domain={[0, 100]} tick={{ fill: 'var(--text-2)' }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="engagement" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Room status table */}
              <div
                className="rounded-2xl overflow-hidden transition-theme"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{ borderBottom: '1px solid var(--border-0)' }}
                >
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>Room Status</h2>
                  <span className="text-[10px]" style={{ color: 'var(--text-2)' }}>
                    {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {rooms.length === 0 ? (
                  <div className="px-5 py-10 text-center text-xs" style={{ color: 'var(--text-3)' }}>
                    No rooms configured
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-0)' }}>
                          {['Room', 'Status', 'Engagement', 'Headcount', 'Capacity'].map(h => (
                            <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                                style={{ color: 'var(--text-2)' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map(room => (
                          <tr key={room.roomId}
                              className="transition-colors"
                              style={{ borderBottom: '1px solid var(--border-0)' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--text-0)' }}>
                              {room.name}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${
                                room.status === 'active'
                                  ? 'bg-green-900/30 text-green-400 border-green-500/25'
                                  : 'bg-gray-800/50 text-gray-500 border-gray-700/50'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'active' ? 'bg-green-400 live-dot' : 'bg-gray-600'}`} />
                                {room.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <EngagementScore value={room.engagement} />
                            </td>
                            <td className="px-5 py-3.5 font-mono" style={{ color: 'var(--text-1)' }}>
                              {room.headcount || '—'}
                            </td>
                            <td className="px-5 py-3.5" style={{ color: 'var(--text-2)' }}>
                              {room.capacity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Student tab */}
      {activeTab === 'student' && (
        loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <StudentTab emotionBreakdown={emotionBreakdown} emotionSessionLabel={emotionSessionLabel} />
        )
      )}

      {/* Lecturer tab */}
      {activeTab === 'lecturer' && (
        loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <LecturerTab rooms={rooms} />
        )
      )}

      {/* AI Insights tab */}
      {activeTab === 'ai' && (
        loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AIInsightsTab trends={trends} />
        )
      )}
    </div>
  );
}
