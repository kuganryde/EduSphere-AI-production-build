import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const TRUST_ITEMS = [
  { icon: '🛡', label: 'PDPA Compliant' },
  { icon: '🔒', label: 'E2E Encrypted' },
  { icon: '🤖', label: 'AI Powered' },
  { icon: '📡', label: 'Secure RTSP' },
];

const FEATURE_LIST = [
  { icon: '◉', color: '#3b82f6', text: 'Real-time emotion & attention analytics' },
  { icon: '◉', color: '#6366f1', text: 'Multi-camera RTSP / webcam / upload' },
  { icon: '◉', color: '#10b981', text: 'Gemini 2.0 Flash pedagogical insights' },
  { icon: '◉', color: '#06b6d4', text: 'HSEmotion valence-arousal sentiment' },
];

export default function LoginModal() {
  const { login } = useAuth();
  const [key, setKey]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { ok, error: err } = await login(key.trim());
    if (!ok) setError(err ?? 'Invalid access key. Please try again.');
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex relative overflow-hidden"
      style={{ background: '#030710' }}
    >
      {/* ── Grid overlay ──────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-hud-grid" style={{ opacity: 0.8 }} />

      {/* ── Ambient orbs ──────────────────────────────────────────── */}
      <div className="orb" style={{
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)',
        top: -200, left: -150, animationDuration: '14s',
        filter: 'blur(55px)',
      }} />
      <div className="orb" style={{
        width: 550, height: 550,
        background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 68%)',
        bottom: -130, right: '3%', animationDuration: '18s', animationDelay: '-6s',
        filter: 'blur(65px)',
      }} />
      <div className="orb" style={{
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
        top: '45%', left: '35%', animationDuration: '22s', animationDelay: '-11s',
        filter: 'blur(75px)',
      }} />
      <div className="orb" style={{
        width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)',
        top: '20%', right: '15%', animationDuration: '26s', animationDelay: '-8s',
        filter: 'blur(80px)',
      }} />

      {/* ── Scanline diagonal overlay ─────────────────────────────── */}
      <div className="absolute inset-0 bg-dot-grid" style={{ opacity: 0.25 }} />
      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32" style={{ background: 'linear-gradient(0deg, rgba(3,7,16,0.8), transparent)', pointerEvents: 'none' }} />

      {/* ── Left hero panel ───────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between relative z-10"
        style={{ width: '58%', padding: '52px 56px' }}
      >
        {/* Top: logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #6366f1)',
              boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">EduSphere AI</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]"
               style={{ color: 'rgba(99,102,241,0.80)' }}>
              University Edition
            </p>
          </div>
        </div>

        {/* Center: hero text */}
        <div className="flex-1 flex flex-col justify-center" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 live-dot" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: '#60a5fa' }}>
              Classroom Intelligence Platform
            </span>
          </div>

          <h1
            className="font-black leading-[1.05] mb-5"
            style={{ fontSize: 48, color: '#f0f6ff', letterSpacing: '-0.03em' }}
          >
            Intelligent
            <br />
            <span style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #38bdf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Classrooms.
            </span>
          </h1>

          <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(148,163,184,0.85)', maxWidth: 400 }}>
            Real-time emotion analytics, attention tracking, and AI-powered pedagogical insights — built for universities, governments, and enterprise.
          </p>

          <div className="flex flex-col gap-2.5">
            {FEATURE_LIST.map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: f.color, boxShadow: `0 0 6px ${f.color}` }}
                />
                <p className="text-sm" style={{ color: 'rgba(148,163,184,0.80)' }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: trust badges */}
        <div className="flex flex-wrap gap-2">
          {TRUST_ITEMS.map(t => (
            <span key={t.label} className="trust-badge">
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center relative z-10 flex-1 lg:flex-none"
        style={{ width: '100%', maxWidth: '100%', padding: '32px 24px' }}
      >
        <div
          className="glass-card rounded-2xl fade-up relative overflow-hidden"
          style={{ width: '100%', maxWidth: 400, padding: 36 }}
        >
          {/* Top gradient accent line */}
          <div className="absolute top-0 left-0 right-0 h-px"
               style={{ background: 'linear-gradient(90deg, transparent, var(--brand) 30%, var(--indigo) 60%, var(--cyan) 85%, transparent)', opacity: 0.8 }} />
          {/* Mobile-only logo */}
          <div className="flex lg:hidden flex-col items-center mb-8 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)' }}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">EduSphere AI</h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.7)' }}>Classroom Intelligence Platform</p>
          </div>

          {/* Card header */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white leading-tight mb-1">
              Institutional Access
            </h2>
            <p className="text-sm" style={{ color: 'rgba(148,163,184,0.70)' }}>
              Enter your access key, or leave blank if your server runs in open-access mode.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs"
              style={{
                background: 'rgba(239,68,68,0.10)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#f87171',
              }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label
                className="block mb-2"
                style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(148,163,184,0.70)' }}
              >
                Institution Access Key
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  className="field font-mono tracking-widest pr-12"
                  placeholder="••••••••••••••••"
                  autoFocus
                  autoComplete="current-password"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f0f6ff',
                  }}
                />
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(148,163,184,0.40)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: loading
                  ? 'rgba(59,130,246,0.5)'
                  : 'linear-gradient(135deg, #2563eb 0%, #6366f1 100%)',
                boxShadow: !loading ? '0 4px 28px rgba(37,99,235,0.50), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Access Dashboard
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* PDPA notice */}
          <div
            className="mt-6 pt-5 flex items-start gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 style={{ color: '#f59e0b' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.45)' }}>
              PDPA Notice: This system monitors classroom activity for educational purposes only. All biometric data is anonymised at source. Access is logged for compliance.
            </p>
          </div>

          {/* Mobile trust badges */}
          <div className="flex lg:hidden flex-wrap gap-1.5 mt-5 justify-center">
            {TRUST_ITEMS.map(t => (
              <span key={t.label} className="trust-badge text-[9px]">
                <span>{t.icon}</span><span>{t.label}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="text-center mt-5" style={{ fontSize: 10, color: 'rgba(148,163,184,0.28)' }}>
          EduSphere AI · v3 · All access is logged
        </p>
      </div>
    </div>
  );
}
