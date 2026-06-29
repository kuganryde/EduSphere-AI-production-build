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
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-900/40">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">EduSphere AI</h1>
          <p className="text-gray-500 text-sm mt-1">Classroom Intelligence Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#121b2f] border border-white/5 rounded-2xl p-6 shadow-xl">
          <h2 className="text-white font-semibold mb-1">Access Required</h2>
          <p className="text-gray-500 text-sm mb-5">Enter your institutional access key to continue.</p>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-xs text-red-400">{error}</div>
          )}

          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Access Key
          </label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors mb-4 font-mono"
            placeholder="Enter access key..."
            autoFocus
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-white text-sm font-semibold transition-colors"
          >
            {loading ? 'Verifying...' : 'Access System'}
          </button>

          <div className="mt-4 px-3 py-2 bg-amber-900/20 border border-amber-500/20 rounded-lg">
            <p className="text-[10px] text-amber-400/80 font-mono">
              PDPA Notice: This system records classroom activity for educational monitoring purposes.
              All data is anonymised and access is logged for compliance.
            </p>
          </div>
        </form>

        <p className="text-center text-gray-700 text-xs mt-4">
          EduSphere AI · PDPA Compliant · Access Logged
        </p>
      </div>
    </div>
  );
}
