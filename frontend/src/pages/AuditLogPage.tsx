import { useState, useEffect } from 'react';
import { getAuthHeader, useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuditRow {
  id: string; action: string; resource: string; resource_id: string | null;
  user_role: string | null; ip_address: string | null; details: unknown;
  created_at: string;
}

const ACTION_STYLES: Record<string, string> = {
  compact_logs:        'text-purple-400 bg-purple-900/20 border-purple-500/25',
  view_reports:        'text-blue-400   bg-blue-900/20   border-blue-500/25',
  view_session_report: 'text-blue-400   bg-blue-900/20   border-blue-500/25',
  start_session:       'text-green-400  bg-green-900/20  border-green-500/25',
  end_session:         'text-amber-400  bg-amber-900/20  border-amber-500/25',
  dismiss_alert:       'text-gray-400   bg-gray-800/40   border-gray-700/40',
};

const ROLE_STYLES: Record<string, string> = {
  admin:    'text-red-400   bg-red-900/20   border-red-500/20',
  operator: 'text-amber-400 bg-amber-900/20 border-amber-500/20',
  viewer:   'text-blue-400  bg-blue-900/20  border-blue-500/20',
};

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
    <div className="flex-1 flex items-center justify-center bg-[#0b1120] min-h-full">
      <div className="text-center">
        <div className="w-14 h-14 bg-red-900/20 rounded-2xl flex items-center justify-center border border-red-500/20 mx-auto mb-4">
          <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">Access Restricted</p>
        <p className="text-gray-500 text-sm">Audit logs require Admin access level.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-[#0b1120]">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-600/15 rounded-xl flex items-center justify-center border border-red-500/20">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Audit Log</h1>
              <p className="text-gray-500 text-xs">All system actions — admin access only</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="bg-[#121b2f] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500/50 transition-colors"
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
              className="flex items-center gap-2 px-3.5 py-2 bg-purple-700/80 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-xl font-semibold transition-colors"
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

      <div className="flex-1 p-6 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="w-14 h-14 bg-[#121b2f] rounded-2xl flex items-center justify-center border border-white/5">
              <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 font-semibold text-sm">No audit entries</p>
              <p className="text-gray-600 text-xs mt-1">Actions will appear here as users interact with the system.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#121b2f] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Timestamp', 'Action', 'Resource', 'Role', 'IP', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                        className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 text-gray-500 font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold border font-mono ${
                            ACTION_STYLES[log.action] ?? 'text-gray-400 bg-gray-800/40 border-gray-700/40'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{log.resource}</td>
                        <td className="px-4 py-3">
                          {log.user_role ? (
                            <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${
                              ROLE_STYLES[log.user_role] ?? 'text-gray-400 bg-gray-800 border-gray-700'
                            }`}>
                              {log.user_role}
                            </span>
                          ) : <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono">{log.ip_address ?? '—'}</td>
                        <td className="px-4 py-3 text-right">
                          {log.details && (
                            <span className={`text-[10px] font-medium transition-colors ${
                              expanded === log.id ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'
                            }`}>
                              {expanded === log.id ? 'hide' : 'details'}
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded === log.id && log.details && (
                        <tr key={`${log.id}-d`} className="bg-[#0b1120]/60 border-b border-white/[0.04]">
                          <td colSpan={6} className="px-4 py-3">
                            <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-40">
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
