import { useState, useEffect } from 'react';
import { getAuthHeader, useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuditRow {
  id: string; action: string; resource: string; resource_id: string | null;
  user_role: string | null; ip_address: string | null; details: unknown;
  created_at: string;
}

const ACTION_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  compact_logs:        { text: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)' },
  view_reports:        { text: 'var(--brand)', bg: 'var(--brand-dim)', border: 'rgba(59,130,246,0.25)' },
  view_session_report: { text: 'var(--brand)', bg: 'var(--brand-dim)', border: 'rgba(59,130,246,0.25)' },
  start_session:       { text: 'var(--success)', bg: 'var(--success-dim)', border: 'rgba(16,185,129,0.25)' },
  end_session:         { text: 'var(--warning)', bg: 'var(--warning-dim)', border: 'rgba(245,158,11,0.25)' },
  dismiss_alert:       { text: 'var(--text-2)', bg: 'var(--surface-3)', border: 'var(--border-1)' },
};

const ROLE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  admin:    { text: 'var(--danger)',  bg: 'var(--danger-dim)',  border: 'rgba(239,68,68,0.25)' },
  operator: { text: 'var(--warning)', bg: 'var(--warning-dim)', border: 'rgba(245,158,11,0.25)' },
  viewer:   { text: 'var(--brand)',   bg: 'var(--brand-dim)',   border: 'rgba(59,130,246,0.25)' },
};

function Pill({ label, colors }: { label: string; colors?: { text: string; bg: string; border: string } }) {
  const c = colors ?? { text: 'var(--text-2)', bg: 'var(--surface-3)', border: 'var(--border-1)' };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold font-mono"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  );
}

export default function AuditLogPage() {
  const { role } = useAuth();
  const [logs, setLogs]           = useState<AuditRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [compacting, setCompacting] = useState(false);

  const load = async (filter = actionFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter) params.set('action', filter);
      const r = await fetch(`${API_URL}/audit?${params}`, { headers: getAuthHeader() });
      if (!r.ok) { setLogs([]); setLoading(false); return; }
      setLogs(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerCompact = async () => {
    if (!confirm('Archive engagement snapshots older than 90 days into daily summaries? This is irreversible.')) return;
    setCompacting(true);
    try {
      const r = await fetch(`${API_URL}/audit/compact`, { method: 'POST', headers: getAuthHeader() });
      const data = await r.json();
      alert(`Compaction complete: ${data.compacted ?? 0} records archived into ${data.summaries_created ?? 0} daily summaries.`);
      load();
    } catch (e) { console.error(e); }
    finally { setCompacting(false); }
  };

  if (role !== 'admin') return (
    <div
      className="flex-1 flex items-center justify-center min-h-full transition-theme"
      style={{ background: 'var(--surface-0)' }}
    >
      <div className="text-center">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)' }}
        >
          <svg className="w-7 h-7" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="font-semibold" style={{ color: 'var(--text-0)' }}>Access Restricted</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>Audit logs require Administrator access.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full transition-theme" style={{ background: 'var(--surface-0)' }}>
      {/* Page header */}
      <div
        className="px-6 pt-5 pb-4"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-0)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text-0)' }}>Audit Log</h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>All system actions — admin access only</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs focus:outline-none transition-colors"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-1)',
                color: 'var(--text-1)',
              }}
            >
              <option value="">All actions</option>
              <option value="view_reports">view_reports</option>
              <option value="view_session_report">view_session_report</option>
              <option value="compact_logs">compact_logs</option>
              <option value="start_session">start_session</option>
              <option value="end_session">end_session</option>
            </select>
            <button
              onClick={triggerCompact}
              disabled={compacting}
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded-xl font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {compacting ? 'Compacting...' : 'Compact Logs'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-5 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)' }}
            >
              <svg className="w-7 h-7" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>No audit entries</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                Actions will appear here as users interact with the system.
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-0)' }}>
                    {['Timestamp', 'Action', 'Resource', 'Role', 'IP', ''].map(h => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border-0)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <td className="px-4 py-3 font-mono whitespace-nowrap" style={{ color: 'var(--text-2)' }}>
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <Pill label={log.action} colors={ACTION_COLORS[log.action]} />
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--text-2)' }}>{log.resource}</td>
                        <td className="px-4 py-3">
                          {log.user_role
                            ? <Pill label={log.user_role} colors={ROLE_COLORS[log.user_role]} />
                            : <span style={{ color: 'var(--text-3)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-3)' }}>
                          {log.ip_address ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {log.details && (
                            <span
                              className="text-[10px] font-medium"
                              style={{ color: expanded === log.id ? 'var(--brand)' : 'var(--text-3)' }}
                            >
                              {expanded === log.id ? 'hide' : 'details'}
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded === log.id && log.details && (
                        <tr key={`${log.id}-d`}>
                          <td colSpan={6} className="px-4 py-3" style={{ background: 'var(--surface-3)', borderBottom: '1px solid var(--border-0)' }}>
                            <pre className="text-[10px] font-mono overflow-x-auto whitespace-pre-wrap max-h-40" style={{ color: 'var(--text-1)' }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
