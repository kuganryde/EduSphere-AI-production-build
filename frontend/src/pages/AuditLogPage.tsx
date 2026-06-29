import { useState, useEffect } from 'react';
import { getAuthHeader, useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface AuditRow {
  id: string; action: string; resource: string; resource_id: string | null;
  user_role: string | null; ip_address: string | null; details: unknown;
  created_at: string;
}

const ACTION_COLOR: Record<string, string> = {
  compact_logs:        'text-purple-400',
  view_reports:        'text-blue-400',
  view_session_report: 'text-blue-400',
  start_session:       'text-green-400',
  end_session:         'text-amber-400',
  dismiss_alert:       'text-gray-400',
};

export default function AuditLogPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (actionFilter) params.set('action', actionFilter);
      const r = await fetch(`${API_URL}/audit?${params}`, { headers: getAuthHeader() });
      if (r.status === 403) { setLogs([]); setLoading(false); return; }
      setLogs(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerCompact = async () => {
    if (!confirm('Archive engagement snapshots older than 90 days? This cannot be undone.')) return;
    const r = await fetch(`${API_URL}/audit/compact`, { method: 'POST', headers: getAuthHeader() });
    const data = await r.json();
    alert(`Compacted ${data.compacted ?? 0} records into ${data.summaries_created ?? 0} daily summaries.`);
    load();
  };

  if (role !== 'admin') return (
    <div className="flex-1 flex items-center justify-center bg-[#0b1120]">
      <div className="text-center">
        <p className="text-red-400 font-semibold mb-2">Access Denied</p>
        <p className="text-gray-500 text-sm">Audit logs require Admin role.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-[#0b1120] p-4 md:p-6 gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Audit Log</h1>
          <p className="text-gray-500 text-sm">All system actions — admin access only</p>
        </div>
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-[#121b2f] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Actions</option>
            <option value="view_reports">view_reports</option>
            <option value="view_session_report">view_session_report</option>
            <option value="compact_logs">compact_logs</option>
            <option value="start_session">start_session</option>
            <option value="end_session">end_session</option>
          </select>
          <button
            onClick={triggerCompact}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm rounded-xl font-semibold transition-colors"
          >
            Compact Logs
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-12 text-center">
          <p className="text-gray-600 text-sm font-mono uppercase tracking-widest">No audit entries</p>
        </div>
      ) : (
        <div className="bg-[#121b2f] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left px-4 py-3">Timestamp</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Resource</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">IP</th>
                  <th className="text-left px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs font-semibold ${ACTION_COLOR[log.action] ?? 'text-gray-300'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{log.resource}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          log.user_role === 'admin' ? 'bg-red-900/30 text-red-400 border-red-500/20'
                            : log.user_role === 'operator' ? 'bg-amber-900/30 text-amber-400 border-amber-500/20'
                            : 'bg-blue-900/30 text-blue-400 border-blue-500/20'
                        }`}>{log.user_role ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs font-mono">{log.ip_address ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {log.details ? (
                          <button className="text-blue-500 hover:text-blue-400 text-xs">
                            {expanded === log.id ? 'hide' : 'expand'}
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                    {expanded === log.id && log.details && (
                      <tr key={`${log.id}-detail`} className="bg-[#0b1120] border-b border-white/5">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap">
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
  );
}
