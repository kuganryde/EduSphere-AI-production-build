import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from '../context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

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
  alert_count: number; alerts: { id: string; message: string; level: number; created_at: string }[];
  timeline: { t: string; e: number; h: number; a: number }[];
}

export default function ReportsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
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
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`${API_URL}/reports/sessions/${id}`, { headers: getAuthHeader() });
      setDetail(await r.json());
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const exportSession = async (id: string) => {
    try {
      const r = await fetch(`${API_URL}/analytics/${id}`, { headers: getAuthHeader() });
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `session_${id}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#0b1120] p-4 md:p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Student Session Reports</h1>
          <p className="text-gray-500 text-sm">{total} sessions recorded</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-12 text-center">
          <p className="text-gray-600 text-sm font-mono uppercase tracking-widest">No sessions recorded yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(s => (
            <div key={s.id} className="bg-[#121b2f] border border-white/5 rounded-2xl overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => toggleDetail(s.id)}
                className="w-full text-left px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm truncate">
                      {s.course_code ? `${s.course_code} — ` : ''}{s.lecturer_name ?? 'Untitled Session'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${s.status === 'active' ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(s.started_at).toLocaleString()} · {s.duration_minutes}min
                  </p>
                </div>
                <div className="flex gap-4 md:gap-6 text-right shrink-0">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Engagement</p>
                    <p className={`text-lg font-bold ${s.avg_engagement > 79 ? 'text-green-400' : s.avg_engagement > 49 ? 'text-amber-400' : s.avg_engagement > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                      {s.avg_engagement > 0 ? `${s.avg_engagement}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Peak</p>
                    <p className="text-lg font-bold text-white">{s.peak_headcount || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Alerts</p>
                    <p className={`text-lg font-bold ${s.alert_count > 0 ? 'text-amber-400' : 'text-gray-600'}`}>{s.alert_count}</p>
                  </div>
                  <div className="flex items-center">
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedId === s.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === s.id && (
                <div className="border-t border-white/5 p-5">
                  {detailLoading ? (
                    <div className="flex items-center justify-center h-24">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : detail ? (
                    <div className="flex flex-col gap-5">
                      {/* Timeline chart */}
                      {detail.timeline.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Engagement Timeline</p>
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={detail.timeline} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="tlineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <XAxis dataKey="t" tickFormatter={v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="#ffffff30" fontSize={9} tickLine={false} axisLine={false} />
                                <YAxis stroke="#ffffff30" fontSize={9} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #ffffff20', borderRadius: '8px', fontSize: '11px' }}
                                  labelFormatter={v => new Date(v).toLocaleTimeString()}
                                  formatter={(v: number, name: string) => [name === 'e' ? `${v}%` : v, name === 'e' ? 'Engagement' : name === 'h' ? 'Headcount' : 'Attention']}
                                />
                                <Area type="monotone" dataKey="e" stroke="#3b82f6" strokeWidth={1.5} fill="url(#tlineGrad)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        {[
                          { label: 'Avg Engagement', val: `${detail.avg_engagement}%` },
                          { label: 'Peak Engagement', val: `${detail.peak_engagement}%` },
                          { label: 'Snapshots', val: detail.snapshot_count },
                          { label: 'Duration', val: `${detail.duration_minutes}min` },
                        ].map(({ label, val }) => (
                          <div key={label} className="bg-[#0b1120] rounded-xl p-3 border border-white/5">
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                            <p className="text-base font-bold text-white">{val}</p>
                          </div>
                        ))}
                      </div>

                      {/* Gesture totals */}
                      {Object.keys(detail.gesture_totals).length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Gesture Totals</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(detail.gesture_totals).map(([k, v]) => (
                              <span key={k} className="px-3 py-1 bg-[#0b1120] border border-white/10 rounded-lg text-xs text-gray-300">
                                {k}: <span className="text-white font-semibold">{v}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Export button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => exportSession(s.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors font-semibold"
                        >
                          Export JSON
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 bg-[#121b2f] border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
            Previous
          </button>
          <span className="text-gray-500 text-sm">Page {page} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1.5 bg-[#121b2f] border border-white/10 rounded-lg text-sm text-gray-400 hover:text-white disabled:opacity-40 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
