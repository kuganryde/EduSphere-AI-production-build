import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { login } = useAuth();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    const { ok, error: err } = await login(key.trim());
    if (!ok) setError(err ?? 'Invalid access key');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">EduSphere AI</h1>
          <p className="text-gray-500 text-sm mt-1">Classroom Intelligence Platform</p>
        </div>

        {/* Card */}
        <div className="bg-[#121b2f] border border-white/[0.07] rounded-2xl p-6 shadow-2xl">
          <h2 className="text-white font-semibold text-base mb-1">Institutional Access</h2>
          <p className="text-gray-500 text-sm mb-5 leading-relaxed">Enter your access key to continue to the monitoring dashboard.</p>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-950/50 border border-red-500/25 rounded-xl text-xs text-red-400">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Access Key
              </label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono tracking-wider"
                placeholder="••••••••••••"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-blue-900/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : 'Access Dashboard'}
            </button>
          </form>

          {/* PDPA notice */}
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-amber-500/70 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-[10px] text-gray-600 leading-relaxed">
                PDPA Notice: This system monitors classroom activity for educational purposes. All biometric data is anonymised. Access is logged for compliance.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-700 mt-5">
          EduSphere AI · PDPA Compliant · All access logged
        </p>
      </div>
    </div>
  );
}
