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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-theme"
      style={{ background: 'var(--surface-0)' }}
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--border-0) 1px, transparent 1px), linear-gradient(90deg, var(--border-0) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[360px] fade-up">
        {/* University branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-blue-900/40">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-0)' }}>
            EduSphere AI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
            Classroom Intelligence Platform
          </p>
          <div
            className="mt-3 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border"
            style={{
              background: 'var(--brand-dim)',
              borderColor: 'rgba(59,130,246,0.30)',
              color: 'var(--brand)',
            }}
          >
            University Edition
          </div>
        </div>

        {/* Login card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-0)',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--border-0)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-0)' }}>
              Institutional Access
            </h2>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-2)' }}>
              Enter your access key to continue to the monitoring system.
            </p>
          </div>

          {error && (
            <div
              className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{
                background: 'var(--danger-dim)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
              }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--text-2)' }}
              >
                Access Key
              </label>
              <input
                type="password"
                value={key}
                onChange={e => setKey(e.target.value)}
                className="field font-mono tracking-wider"
                placeholder="••••••••••••"
                autoFocus
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'var(--brand)',
                boxShadow: '0 4px 16px var(--brand-glow)',
              }}
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
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-0)' }}>
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                   style={{ color: 'var(--warning)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                PDPA Notice: This system monitors classroom activity for educational purposes. All biometric data is anonymised at source. Access is logged for compliance.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] mt-5" style={{ color: 'var(--text-3)' }}>
          EduSphere AI · PDPA Compliant · All access is logged
        </p>
      </div>
    </div>
  );
}
