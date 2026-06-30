import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const TRUST_ITEMS = [
  { icon: '⬡', label: 'PDPA Compliant' },
  { icon: '◈', label: 'E2E Encrypted' },
  { icon: '◎', label: 'AI Powered' },
  { icon: '◉', label: 'Secure RTSP' },
];

const FEATURE_LIST = [
  { color: '#3b82f6', text: 'Real-time emotion & attention analytics', icon: '▸' },
  { color: '#6366f1', text: 'Multi-camera RTSP / webcam / upload',    icon: '▸' },
  { color: '#10b981', text: 'Gemini 2.0 Flash pedagogical insights',  icon: '▸' },
  { color: '#06b6d4', text: 'HSEmotion valence-arousal sentiment',    icon: '▸' },
];

const STAT_ITEMS = [
  { value: '500+',  label: 'Institutions' },
  { value: '2M+',   label: 'Students' },
  { value: '99.9%', label: 'Uptime' },
];

/* Neural network SVG overlay */
function NeuralNetworkSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.18 }}
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <line x1="120" y1="80"  x2="280" y2="180" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="4 8" />
      <line x1="280" y1="180" x2="480" y2="120" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="4 8" />
      <line x1="480" y1="120" x2="650" y2="220" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="4 8" />
      <line x1="280" y1="180" x2="350" y2="360" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="3 6" />
      <line x1="350" y1="360" x2="550" y2="420" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3 6" />
      <line x1="120" y1="80"  x2="350" y2="360" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="2 10" />
      <line x1="650" y1="220" x2="550" y2="420" stroke="#06b6d4" strokeWidth="0.8" strokeDasharray="4 8" />
      <line x1="550" y1="420" x2="680" y2="520" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="4 8" />
      <line x1="350" y1="360" x2="200" y2="480" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="3 6" />
      <line x1="480" y1="120" x2="350" y2="360" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 10" />
      {[
        [120, 80], [280, 180], [480, 120], [650, 220],
        [350, 360], [550, 420], [200, 480], [680, 520],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="#3b82f6" opacity="0.7" />
      ))}
    </svg>
  );
}

/* Floating neural nodes */
function NeuralNodes() {
  const nodes = [
    { top: '12%',  left: '8%',  delay: '0s',    dur: '7s',  anim: 'neural-float-1' },
    { top: '38%',  left: '5%',  delay: '-2s',   dur: '9s',  anim: 'neural-float-2' },
    { top: '65%',  left: '12%', delay: '-4s',   dur: '8s',  anim: 'neural-float-3' },
    { top: '20%',  left: '88%', delay: '-1s',   dur: '10s', anim: 'neural-float-4' },
    { top: '55%',  left: '92%', delay: '-3s',   dur: '7s',  anim: 'neural-float-1' },
    { top: '80%',  left: '85%', delay: '-5s',   dur: '9s',  anim: 'neural-float-2' },
    { top: '48%',  left: '50%', delay: '-6s',   dur: '11s', anim: 'neural-float-3' },
    { top: '85%',  left: '35%', delay: '-2.5s', dur: '8s',  anim: 'neural-float-4' },
  ];
  return (
    <>
      {nodes.map((n, i) => (
        <div
          key={i}
          className="neural-node"
          style={{ top: n.top, left: n.left, animation: `${n.anim} ${n.dur} ease-in-out ${n.delay} infinite` }}
        />
      ))}
    </>
  );
}

export default function LoginModal() {
  const { login } = useAuth();
  const [key, setKey]         = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { ok, error: err } = await login(key.trim());
    if (!ok) {
      setError(err ?? 'Invalid access key. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#030a18' }}>
      {/* Grid + ambient orbs */}
      <div className="absolute inset-0 bg-hud-grid" style={{ opacity: 0.6 }} />
      <div className="orb" style={{ width: 800, height: 800, background: 'radial-gradient(circle, rgba(37,99,235,0.20) 0%, transparent 65%)', top: -250, left: -200, animationDuration: '14s', filter: 'blur(60px)' }} />
      <div className="orb" style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 68%)', bottom: -150, right: '2%', animationDuration: '18s', animationDelay: '-6s', filter: 'blur(70px)' }} />
      <div className="orb" style={{ width: 450, height: 450, background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)', top: '40%', left: '30%', animationDuration: '22s', animationDelay: '-11s', filter: 'blur(80px)' }} />
      <div className="orb" style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, transparent 70%)', top: '15%', right: '12%', animationDuration: '26s', animationDelay: '-8s', filter: 'blur(85px)' }} />
      <div className="absolute inset-0 bg-dot-grid" style={{ opacity: 0.20 }} />
      <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: 'linear-gradient(0deg, rgba(3,10,24,0.85), transparent)', pointerEvents: 'none' }} />

      {/* ── Left hero panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between relative z-10 overflow-hidden" style={{ width: '56%', padding: '52px 56px' }}>
        <NeuralNetworkSVG />
        <NeuralNodes />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
               style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', boxShadow: '0 4px 24px rgba(37,99,235,0.50),inset 0 1px 0 rgba(255,255,255,0.15)' }}>
            <div className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', filter: 'blur(8px)', opacity: 0.5, transform: 'scale(1.2)' }} />
            <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight tracking-tight">EduSphere AI</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.20em]" style={{ color: 'rgba(99,102,241,0.80)' }}>University Edition</p>
          </div>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center relative z-10" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 w-fit"
               style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.22)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 live-dot" />
            <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: '#60a5fa' }}>Classroom Intelligence Platform</span>
          </div>

          <h1 className="font-black leading-[1.02] mb-5" style={{ fontSize: 52, color: '#f0f6ff', letterSpacing: '-0.03em' }}>
            Intelligent
            <br />
            <span style={{ background: 'linear-gradient(135deg,#60a5fa 0%,#818cf8 45%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Classrooms.
            </span>
          </h1>

          <p className="text-[13px] leading-relaxed mb-8" style={{ color: 'rgba(148,163,184,0.80)', maxWidth: 420 }}>
            Real-time emotion analytics, attention tracking, and AI-powered pedagogical insights — built for universities, governments, and enterprise.
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {FEATURE_LIST.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
                     style={{ background: `${f.color}18`, border: `1px solid ${f.color}30`, color: f.color }}>
                  {f.icon}
                </div>
                <p className="text-[13px]" style={{ color: 'rgba(148,163,184,0.80)' }}>{f.text}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            {STAT_ITEMS.map((s, i) => (
              <div key={i}>
                <p className="text-xl font-black leading-tight"
                   style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {s.value}
                </p>
                <p className="text-[10px] font-medium" style={{ color: 'rgba(148,163,184,0.50)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap gap-2 relative z-10">
          {TRUST_ITEMS.map(t => (
            <span key={t.label} className="trust-badge">
              <span style={{ color: '#60a5fa' }}>{t.icon}</span>
              <span>{t.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center relative z-10 flex-1 lg:flex-none" style={{ padding: '32px 24px' }}>
        <div
          className="glass-card rounded-2xl fade-up relative overflow-hidden"
          style={{ width: '100%', maxWidth: 420, padding: 40 }}
        >
          {/* Prismatic top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5"
               style={{ background: 'linear-gradient(90deg,transparent,#3b82f6 20%,#6366f1 50%,#06b6d4 80%,transparent)', opacity: 0.9 }} />

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                 style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', boxShadow: '0 8px 32px rgba(37,99,235,0.45)' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">EduSphere AI</h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(148,163,184,0.65)' }}>Classroom Intelligence Platform</p>
          </div>

          {/* Card header */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#3b82f6,#6366f1)' }} />
              <h2 className="text-lg font-bold text-white leading-tight">Institutional Access</h2>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(148,163,184,0.55)', paddingLeft: 12 }}>
              Enter your institution access key, or leave blank if your server runs in open-access mode.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs"
                 style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', color: '#f87171' }}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2"
                     style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(148,163,184,0.60)' }}>
                Institution Access Key
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.35)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  className="field font-mono tracking-widest pl-10 pr-12"
                  placeholder="••••••••••••••••"
                  autoFocus
                  autoComplete="current-password"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: '#f0f6ff' }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: showKey ? '#60a5fa' : 'rgba(148,163,184,0.35)' }}
                  tabIndex={-1}
                >
                  {showKey ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden"
              style={{
                background: loading ? 'rgba(59,130,246,0.45)' : 'linear-gradient(135deg,#2563eb 0%,#6366f1 100%)',
                boxShadow: !loading ? '0 4px 28px rgba(37,99,235,0.45),inset 0 1px 0 rgba(255,255,255,0.12)' : 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }} />
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Access Platform
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* PDPA notice */}
          <div className="mt-6 pt-5 flex items-start gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#f59e0b' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(148,163,184,0.40)' }}>
              PDPA Notice: This system monitors classroom activity for educational purposes only. All biometric data is anonymised at source. Access is logged for compliance.
            </p>
          </div>

          {/* Mobile trust badges */}
          <div className="flex lg:hidden flex-wrap gap-1.5 mt-5 justify-center">
            {TRUST_ITEMS.map(t => (
              <span key={t.label} className="trust-badge text-[9px]">
                <span style={{ color: '#60a5fa' }}>{t.icon}</span>
                <span>{t.label}</span>
              </span>
            ))}
          </div>
        </div>

        <p className="text-center mt-5" style={{ fontSize: 10, color: 'rgba(148,163,184,0.22)' }}>
          EduSphere AI · Enterprise v4 · All access is logged and audited
        </p>
      </div>
    </div>
  );
}
