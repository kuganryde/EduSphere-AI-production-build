import { useState, useEffect } from 'react';
import { Session } from '../types';

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

export default function SessionPanel({ currentSession, roomId, onSessionStart, onSessionEnd }: SessionPanelProps) {
  const [lecturerName, setLecturerName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [capacity, setCapacity] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live session timer
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
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          lecturer_name: lecturerName.trim(),
          course_code: courseCode.trim(),
          expected_capacity: capacity ? parseInt(capacity) : 30,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const session: Session = await res.json();
      onSessionStart(session);
      setLecturerName('');
      setCourseCode('');
      setCapacity('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!currentSession) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/sessions/${currentSession.id}/end`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await res.text());
      onSessionEnd();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentSession) return;
    try {
      const res = await fetch(`${API_URL}/analytics/${currentSession.id}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${currentSession.course_code}-${currentSession.started_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl shadow-sm w-full h-full flex flex-col">
      <h2 className="text-base font-semibold text-white mb-5 flex items-center justify-between shrink-0">
        Manage Session
        <div className={`w-2 h-2 rounded-full ${currentSession ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></div>
      </h2>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-xs text-red-400">{error}</div>
      )}

      <div className="flex-1 flex flex-col gap-4">
        {!currentSession ? (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Lecturer Name</label>
              <input
                type="text"
                value={lecturerName}
                onChange={e => setLecturerName(e.target.value)}
                className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="e.g. Dr. Smith"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Course Code</label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. CS101"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Capacity</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={e => setCapacity(e.target.value)}
                  className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. 50"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-[#0b1120] rounded-xl px-4 py-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Lecturer</p>
              <p className="text-sm font-semibold text-white">{currentSession.lecturer_name}</p>
            </div>
            <div className="bg-[#0b1120] rounded-xl px-4 py-3 border border-white/5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Course</p>
              <p className="text-sm font-semibold text-white">{currentSession.course_code}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center bg-[#0b1120] px-4 py-3.5 rounded-xl border border-white/5 mt-auto">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {currentSession ? 'Session Time' : 'No Active Session'}
          </span>
          <span className={`font-mono font-bold text-sm tracking-widest ${currentSession ? 'text-green-400' : 'text-gray-600'}`}>
            {elapsed}
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          {!currentSession ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600/20 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Session'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600/20 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Stopping...' : 'Stop Session'}
            </button>
          )}
        </div>

        {currentSession && (
          <button
            onClick={handleExport}
            className="w-full px-4 py-3 bg-[#1e293b] border border-white/5 text-white hover:bg-[#334155] rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider"
          >
            Export Report
          </button>
        )}
      </div>
    </div>
  );
}
