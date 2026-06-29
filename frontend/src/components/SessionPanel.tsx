import { useState, useEffect } from 'react';
import { Session } from '../types';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface SessionPanelProps {
  currentSession: Session | null;
  roomId: string;
  onSessionStart: (session: Session) => void;
  onSessionEnd: () => void;
}

function formatElapsed(startedAt: string): string {
  const diff = Date.now() - new Date(startedAt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function Field({ label, value, placeholder, onChange, type = 'text' }: {
  label: string; value: string; placeholder: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="field text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

export default function SessionPanel({ currentSession, roomId, onSessionStart, onSessionEnd }: SessionPanelProps) {
  const [lecturerName, setLecturerName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [capacity, setCapacity] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentSession) { setElapsed('00:00:00'); return; }
    const tick = () => setElapsed(formatElapsed(currentSession.started_at));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentSession]);

  const handleStart = async () => {
    if (!lecturerName.trim() || !courseCode.trim()) {
      setError('Lecturer name and course code are required.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          room_id: roomId,
          lecturer_name: lecturerName.trim(),
          course_code: courseCode.trim(),
          expected_capacity: capacity ? parseInt(capacity) : 30,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSessionStart(await res.json());
      setLecturerName(''); setCourseCode(''); setCapacity('');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleStop = async () => {
    if (!currentSession) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_URL}/sessions/${currentSession.id}/end`, {
        method: 'PATCH', headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error(await res.text());
      onSessionEnd();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    if (!currentSession) return;
    try {
      const res = await fetch(`${API_URL}/analytics/${currentSession.id}`, { headers: getAuthHeader() });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${currentSession.course_code}-${currentSession.started_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { setError(err.message); }
  };

  return (
    <div
      className="p-5 rounded-2xl w-full h-full flex flex-col transition-theme"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}
    >
      <h2 className="text-sm font-semibold mb-4 flex items-center justify-between shrink-0" style={{ color: 'var(--text-0)' }}>
        Manage Session
        <div className={`w-2 h-2 rounded-full ${currentSession ? 'bg-green-500 live-dot' : 'bg-gray-600'}`} />
      </h2>

      {error && (
        <div
          className="mb-4 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col gap-3.5">
        {!currentSession ? (
          <>
            <Field label="Lecturer Name" value={lecturerName} onChange={setLecturerName} placeholder="e.g. Dr. Smith" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Course Code" value={courseCode} onChange={setCourseCode} placeholder="e.g. CS101" />
              <Field label="Capacity" value={capacity} onChange={setCapacity} placeholder="e.g. 50" type="number" />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Lecturer', val: currentSession.lecturer_name },
              { label: 'Course',   val: currentSession.course_code },
            ].map(row => (
              <div
                key={row.label}
                className="px-4 py-3 rounded-xl"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}
              >
                <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
                  {row.label}
                </p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-0)' }}>{row.val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Timer */}
        <div
          className="flex justify-between items-center px-4 py-3 rounded-xl mt-auto"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>
            {currentSession ? 'Session Time' : 'No Active Session'}
          </span>
          <span
            className="font-mono font-bold text-sm tracking-widest"
            style={{ color: currentSession ? 'var(--success)' : 'var(--text-3)' }}
          >
            {elapsed}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          {!currentSession ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider disabled:opacity-50"
              style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', color: 'var(--success)' }}
            >
              {loading ? 'Starting…' : 'Start Session'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider disabled:opacity-50"
              style={{ background: 'var(--danger-dim)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
            >
              {loading ? 'Stopping…' : 'Stop Session'}
            </button>
          )}
        </div>

        {currentSession && (
          <button
            onClick={handleExport}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-4)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'}
          >
            Export Report
          </button>
        )}
      </div>
    </div>
  );
}
