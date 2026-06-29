import { useState, lazy, Suspense } from 'react';
import { AnalysisUpdate } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';

const Dashboard     = lazy(() => import('./components/Dashboard'));
const OperatorMode  = lazy(() => import('./components/OperatorMode'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage   = lazy(() => import('./pages/ReportsPage'));
const AuditLogPage  = lazy(() => import('./pages/AuditLogPage'));

type Page = 'dashboard' | 'operator' | 'analytics' | 'reports' | 'audit';

const Spinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const NAV_ITEMS: {
  id: Page; label: string; sublabel?: string; perm?: string; hidden?: boolean;
  icon: React.ReactNode;
}[] = [
  {
    id: 'dashboard', label: 'Dashboard', sublabel: 'Real-time',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: 'operator', label: 'Operator', sublabel: 'Display mode', perm: 'operator_mode',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'analytics', label: 'Analytics', sublabel: 'Trends & rooms', perm: 'view_analytics',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'reports', label: 'Reports', sublabel: 'Session history', perm: 'view_reports',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'audit', label: 'Audit Log', sublabel: 'Admin only', perm: 'view_audit_logs',
    icon: (
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const ROLE_CONFIG: Record<string, { label: string; dot: string }> = {
  admin:    { label: 'Admin',    dot: 'bg-red-400' },
  operator: { label: 'Operator', dot: 'bg-amber-400' },
  viewer:   { label: 'Viewer',   dot: 'bg-blue-400' },
};

function AppShell() {
  const { isAuthenticated, role, logout, can, openMode } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [liveStats, setLiveStats] = useState<AnalysisUpdate | null>(null);

  if (!isAuthenticated) return <LoginModal />;

  if (page === 'operator') {
    return (
      <div className="h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col">
        <Suspense fallback={<Spinner />}>
          <OperatorMode onSwitch={() => setPage('dashboard')} liveStats={liveStats} capacity={34} />
        </Suspense>
      </div>
    );
  }

  const roleMeta = ROLE_CONFIG[role ?? 'viewer'];

  return (
    <div className="flex h-screen bg-[#0b1120] text-gray-200 overflow-hidden font-sans">
      {/* ── Sidebar ─────────────────────────────────────────────────────────────── */}
      <nav className="w-[72px] lg:w-60 border-r border-white/5 bg-[#0e1526] flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 lg:px-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-900/50">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-bold text-white leading-tight">EduSphere</p>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest leading-tight">Vision AI</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-3 px-2 lg:px-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="hidden lg:block px-2 py-2 text-[9px] font-bold text-gray-600 uppercase tracking-[0.15em]">Navigation</p>
          {NAV_ITEMS.map(item => {
            if (item.hidden) return null;
            if (item.perm && !can(item.perm)) return null;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className={`group flex items-center gap-3 px-2 py-2.5 rounded-xl w-full text-left transition-all duration-150 ${
                  active
                    ? 'bg-blue-600/15 text-blue-400'
                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                <span className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                  {item.icon}
                </span>
                <div className="hidden lg:block min-w-0">
                  <p className={`text-sm font-medium leading-tight truncate ${active ? 'text-blue-300' : ''}`}>{item.label}</p>
                  {item.sublabel && (
                    <p className="text-[10px] text-gray-600 leading-tight truncate">{item.sublabel}</p>
                  )}
                </div>
                {active && <div className="hidden lg:block ml-auto w-1 h-5 bg-blue-500 rounded-full shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer: role + logout */}
        <div className="border-t border-white/5 p-2 lg:p-3 shrink-0">
          {!openMode && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl mb-1">
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-lg bg-[#1a2540] border border-white/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-300 uppercase">{role?.[0] ?? '?'}</span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0e1526] ${roleMeta?.dot ?? 'bg-gray-500'}`} />
              </div>
              <div className="hidden lg:block min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-300 leading-tight">{roleMeta?.label ?? role}</p>
                <p className="text-[10px] text-gray-600 leading-tight truncate">Access level</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center justify-center lg:justify-start gap-2.5 w-full px-2 py-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-900/10 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden lg:block text-xs font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-w-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        }>
          {page === 'dashboard'  && <Dashboard onLiveStats={setLiveStats} />}
          {page === 'analytics'  && <AnalyticsPage />}
          {page === 'reports'    && <ReportsPage />}
          {page === 'audit'      && <AuditLogPage />}
        </Suspense>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
