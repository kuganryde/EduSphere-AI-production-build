import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertRecord } from '../types';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const LEVEL_STYLES: Record<number, { bg: string; border: string; text: string; icon: string }> = {
  1: { bg: 'bg-blue-900/20',  border: 'border-blue-500/30',  text: 'text-blue-400',  icon: 'ℹ' },
  2: { bg: 'bg-amber-900/20', border: 'border-amber-500/30', text: 'text-amber-400', icon: '⚠' },
  3: { bg: 'bg-red-900/20',   border: 'border-red-500/30',   text: 'text-red-400',   icon: '🚨' },
};

interface AlertLogProps {
  roomId: string;
  sessionId?: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AlertLog({ roomId, sessionId }: AlertLogProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const sseRef = useRef<EventSource | null>(null);
  const [, tick] = useState(0); // force re-render for time display

  // Initial fetch
  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ dismissed: 'false', limit: '30' });
      if (roomId) params.set('room_id', roomId);
      if (sessionId) params.set('session_id', sessionId);
      const res = await fetch(`${API_URL}/alerts?${params}`, { headers: getAuthHeader() });
      if (res.ok) {
        const data: AlertRecord[] = await res.json();
        setAlerts(data);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, sessionId]);

  // SSE subscription for real-time alerts
  useEffect(() => {
    fetchAlerts();

    const es = new EventSource(`${API_URL}/stream/${roomId}`);
    sseRef.current = es;

    es.addEventListener('alert', (e: MessageEvent) => {
      try {
        const alert: AlertRecord = JSON.parse(e.data);
        setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
      } catch {}
    });

    return () => { es.close(); sseRef.current = null; };
  }, [roomId, fetchAlerts]);

  // Refresh relative timestamps every 30s
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const dismiss = async (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    await fetch(`${API_URL}/alerts/${id}/dismiss`, { method: 'PATCH', headers: getAuthHeader() });
  };

  const dismissAll = async () => {
    setAlerts([]);
    await fetch(`${API_URL}/alerts/dismiss-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ room_id: roomId }),
    });
  };

  return (
    <div className="bg-[#121b2f] border border-white/5 rounded-2xl p-5 flex flex-col h-full min-h-[220px] shadow-sm">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          Error Log
          {alerts.length > 0 && (
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
          )}
        </h3>
        {alerts.length > 1 && (
          <button onClick={dismissAll} className="text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-wider transition-colors">
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {loading && (
          <div className="flex items-center justify-center h-full py-6">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {!loading && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 text-xs font-mono uppercase tracking-widest">No alerts — all clear</p>
          </div>
        )}

        {alerts.map(alert => {
          const style = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES[1];
          return (
            <div key={alert.id} className={`${style.bg} border ${style.border} rounded-xl px-3 py-2.5 flex items-start gap-2.5 group`}>
              <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${style.text} leading-snug`}>{alert.message}</p>
                <p className="text-[10px] text-gray-600 mt-1 font-mono">{timeAgo(alert.created_at)}</p>
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="shrink-0 text-gray-600 hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100 ml-1 text-sm leading-none"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
