import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertRecord } from '../types';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const LEVEL_STYLES: Record<number, { bg: string; border: string; color: string; icon: string }> = {
  1: { bg: 'var(--info-dim)',    border: 'var(--info)',    color: 'var(--info)',    icon: 'i' },
  2: { bg: 'var(--warning-dim)', border: 'var(--warning)', color: 'var(--warning)', icon: '!' },
  3: { bg: 'var(--danger-dim)',  border: 'var(--danger)',  color: 'var(--danger)',  icon: '!!' },
};

interface AlertLogProps {
  roomId: string;
  sessionId?: string;
  demoMode?: boolean;
  demoAlerts?: AlertRecord[];
  onDemoAlertDismiss?: (id: string) => void;
  onDemoAlertDismissAll?: () => void;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AlertLog({
  roomId, sessionId,
  demoMode, demoAlerts, onDemoAlertDismiss, onDemoAlertDismissAll,
}: AlertLogProps) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const sseRef = useRef<EventSource | null>(null);
  const [, tick] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams({ dismissed: 'false', limit: '30' });
      if (roomId) params.set('room_id', roomId);
      if (sessionId) params.set('session_id', sessionId);
      const res = await fetch(`${API_URL}/alerts?${params}`, { headers: getAuthHeader() });
      if (res.ok) setAlerts(await res.json());
    } finally { setLoading(false); }
  }, [roomId, sessionId]);

  useEffect(() => {
    if (demoMode) { setLoading(false); return; }
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
  }, [roomId, fetchAlerts, demoMode]);

  useEffect(() => {
    if (demoMode) return;
    const id = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, [demoMode]);

  const dismiss = async (id: string) => {
    if (demoMode) { onDemoAlertDismiss?.(id); return; }
    setAlerts(prev => prev.filter(a => a.id !== id));
    await fetch(`${API_URL}/alerts/${id}/dismiss`, { method: 'PATCH', headers: getAuthHeader() });
  };

  const dismissAll = async () => {
    if (demoMode) { onDemoAlertDismissAll?.(); return; }
    setAlerts([]);
    await fetch(`${API_URL}/alerts/dismiss-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ room_id: roomId }),
    });
  };

  const displayAlerts = demoMode ? (demoAlerts ?? []) : alerts;
  const isLoading     = demoMode ? false : loading;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col h-full min-h-[200px] transition-theme"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-0)' }}>
          Alert Log
          {displayAlerts.length > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
            >
              {displayAlerts.length}
            </span>
          )}
          {demoMode && (
            <span className="text-[8px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                  style={{ background: 'rgba(245,158,11,0.14)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.35)' }}>
              Demo
            </span>
          )}
        </h3>
        {displayAlerts.length > 1 && (
          <button
            onClick={dismissAll}
            className="text-[10px] uppercase tracking-wider transition-colors"
            style={{ color: 'var(--text-2)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-0)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 scrollbar-thin scrollbar-track-transparent">
        {isLoading && (
          <div className="flex items-center justify-center h-full py-6">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && displayAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <svg className="w-8 h-8" style={{ color: 'var(--text-3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              No alerts — all clear
            </p>
          </div>
        )}

        {displayAlerts.map(alert => {
          const s = LEVEL_STYLES[alert.level] ?? LEVEL_STYLES[1];
          return (
            <div
              key={alert.id}
              className="rounded-xl px-3 py-2.5 flex items-start gap-2.5 group transition-theme"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <span className="text-xs shrink-0 mt-0.5 font-bold" style={{ color: s.color }}>{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-snug" style={{ color: s.color }}>{alert.message}</p>
                <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-3)' }}>{timeAgo(alert.created_at)}</p>
              </div>
              <button
                onClick={() => dismiss(alert.id)}
                className="shrink-0 transition-colors opacity-0 group-hover:opacity-100 text-sm leading-none"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}
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
