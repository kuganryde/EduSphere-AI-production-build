import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface SessionRow {
  id: string; lecturer_name: string | null; course_code: string | null;
  started_at: string; ended_at: string | null; status: string;
  avg_engagement: number; peak_headcount: number; snapshot_count: number;
  alert_count: number; duration_minutes: number;
}

interface SessionDetail {
  session: SessionRow;
  duration_minutes: number; avg_engagement: number; peak_engagement: number; low_engagement: number;
  snapshot_count: number; gesture_totals: Record<string, number>;
  sentiment_distribution: Record<string, number>;
  alert_count: number;
  timeline: { t: string; e: number; h: number; a: number }[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 shadow-xl text-xs"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-0)' }}
    >
      <p className="font-semibold text-blue-400">{payload[0]?.value}%</p>
    </div>
  );
};

function EngBadge({ value }: { value: number }) {
  const color = value > 79 ? 'var(--success)' : value > 49 ? 'var(--warning)' : value > 0 ? 'var(--danger)' : 'var(--text-3)';
  return <span style={{ color, fontWeight: 700 }}>{value > 0 ? `${value}%` : '—'}</span>;
}

export default function ReportsPage() {
  const [sessions, setSessions]         = useState<SessionRow[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [detail, setDetail]             = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSessions = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}/reports/sessions?page=${p}&limit=20`, { headers: getAuthHeader() });
      const data = await r.json();
      setSessions(data.sessions ?? []);
      setTotal(data.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSessions(page); }, [page, loadSessions]);

  const toggleDetail = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id); setDetail(null); setDetailLoading(true);
    try {
      const r = await fetch(`${API_URL}/reports/sessions/${id}`, { headers: getAuthHeader() });
      setDetail(await r.json());
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const exportSession = async (id: string, courseCode: string | null, startedAt: string) => {
    try {
      const r = await fetch(`${API_URL}/analytics/${id}`, { headers: getAuthHeader() });
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session_${courseCode ?? id}_${startedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex flex-col min-h-full transition-theme" style={{ background: 'var(--surface-0)' }}>
      {/* Page header */}
      <div
        className="px-6 pt-5 pb-4"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-0)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="page-header-icon">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text-0)' }}>
                Session Reports
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                {total} sessions recorded
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-3 overflow-auto">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}
            >
              <svg className="w-7 h-7" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>No sessions recorded yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                Start a monitoring session from the dashboard to see reports here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {sessions.map(s => (
              <div
                key={s.id}
                className="rounded-2xl overflow-hidden transition-theme"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
              >
                {/* Session row */}
                <button
                  onClick={() => toggleDetail(s.id)}
                  className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-0)' }}>
                        {s.course_code ? s.course_code : 'Untitled'}
                        {s.lecturer_name ? ` · ${s.lecturer_name}` : ''}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                        s.status === 'active'
                          ? 'bg-green-900/30 text-green-400 border-green-500/25'
                          : 'bg-gray-800/50 text-gray-500 border-gray-700/50'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-green-400 live-dot' : 'bg-gray-600'}`} />
                        {s.status}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                      {fmtDate(s.started_at)} · {s.duration_minutes}min
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-5 sm:gap-6 shrink-0">
                    {[
                      { label: 'Engagement', node: <EngBadge value={s.avg_engagement} /> },
                      { label: 'Peak', node: <span style={{ color: 'var(--text-0)', fontWeight: 700 }}>{s.peak_headcount || '—'}</span> },
                      { label: 'Alerts',  node: <span style={{ color: s.alert_count > 0 ? 'var(--warning)' : 'var(--text-3)', fontWeight: 700 }}>{s.alert_count}</span> },
                    ].map(m => (
                      <div key={m.label} className="text-center min-w-[44px]">
                        <p className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-3)' }}>{m.label}</p>
                        <p className="text-base">{m.node}</p>
                      </div>
                    ))}
                    <div
                      className={`w-4 h-4 flex items-center justify-center transition-transform duration-200 ${expandedId === s.id ? 'rotate-90' : ''}`}
                      style={{ color: 'var(--text-2)' }}
                    >
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === s.id && (
                  <div
                    className="px-5 py-5 fade-in"
                    style={{ borderTop: '1px solid var(--border-0)', background: 'var(--surface-3)' }}
                  >
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : detail ? (
                      <div className="flex flex-col gap-5">
                        {/* Stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'Avg Engagement',  val: `${detail.avg_engagement}%`,  color: 'var(--brand)' },
                            { label: 'Peak Engagement', val: `${detail.peak_engagement}%`, color: 'var(--success)' },
                            { label: 'Snapshots',        val: detail.snapshot_count,         color: 'var(--text-0)' },
                            { label: 'Duration',         val: `${detail.duration_minutes}m`, color: 'var(--text-0)' },
                          ].map(({ label, val, color }) => (
                            <div
                              key={label}
                              className="rounded-xl p-3.5 text-center"
                              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}
                            >
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>
                                {label}
                              </p>
                              <p className="text-lg font-bold" style={{ color }}>{val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Timeline chart */}
                        {detail.timeline.length > 0 && (
                          <div
                            className="rounded-xl p-4"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}
                          >
                            <p className="text-[10px] uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--text-2)' }}>
                              Engagement Timeline
                            </p>
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={detail.timeline} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-0)" vertical={false} />
                                  <XAxis dataKey="t" stroke="var(--border-1)" fontSize={9} tickLine={false} axisLine={false}
                                         tick={{ fill: 'var(--text-2)' }}
                                         tickFormatter={v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                                  <YAxis stroke="var(--border-1)" fontSize={9} tickLine={false} axisLine={false}
                                         domain={[0, 100]} tick={{ fill: 'var(--text-2)' }} />
                                  <Tooltip content={<ChartTooltip />} />
                                  <Area type="monotone" dataKey="e" stroke="#3b82f6" strokeWidth={1.5} fill="url(#tlGrad)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Gesture totals */}
                        {Object.keys(detail.gesture_totals).length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--text-2)' }}>
                              Gesture Breakdown
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(detail.gesture_totals).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-3 py-1.5 rounded-xl text-xs"
                                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}
                                >
                                  {k}: <span style={{ color: 'var(--text-0)', fontWeight: 600 }}>{v}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            onClick={() => exportSession(s.id, s.course_code, s.started_at)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl transition-colors font-semibold"
                            style={{ boxShadow: '0 4px 12px var(--brand-glow)' }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export JSON
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}
                >
                  Previous
                </button>
                <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-40"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
