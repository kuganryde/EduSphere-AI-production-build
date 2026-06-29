import { useState, lazy, Suspense } from 'react';
import { AnalysisUpdate } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
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

/* Sun icon */
const SunIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M5.64 18.36l-.71.71m12.73 0-.71-.71M5.64 5.64l-.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);

/* Moon icon */
const MoonIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
  </svg>
);

const NAV_ITEMS: {
  id: Page; label: string; sublabel?: string; perm?: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'dashboard', label: 'Dashboard', sublabel: 'Live monitoring',
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

const ROLE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  admin:    { label: 'Administrator', dot: 'bg-red-400',   badge: 'text-red-300' },
  operator: { label: 'Operator',      dot: 'bg-amber-400', badge: 'text-amber-300' },
  viewer:   { label: 'Viewer',        dot: 'bg-blue-400',  badge: 'text-blue-300' },
};

function AppShell() {
  const { isAuthenticated, role, logout, can, openMode } = useAuth();
  const { theme, toggle, isDark } = useTheme();
  const [page, setPage] = useState<Page>('dashboard');
  const [liveStats, setLiveStats] = useState<AnalysisUpdate | null>(null);

  if (!isAuthenticated) return <LoginModal />;

  if (page === 'operator') {
    return (
      <div className="h-screen bg-[var(--surface-0)] text-[var(--text-0)] overflow-hidden flex flex-col transition-theme">
        <Suspense fallback={<Spinner />}>
          <OperatorMode onSwitch={() => setPage('dashboard')} liveStats={liveStats} capacity={34} />
        </Suspense>
      </div>
    );
  }

  const roleMeta = ROLE_CONFIG[role ?? 'viewer'];

  return (
    <div className="flex h-screen overflow-hidden transition-theme" style={{ background: 'var(--surface-0)', color: 'var(--text-0)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────────── */}
      <nav
        className="w-[68px] lg:w-[220px] flex flex-col shrink-0 transition-theme"
        style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border-0)' }}
      >
        {/* Logo */}
        <div
          className="h-[60px] flex items-center px-3 lg:px-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3 min-w-0 w-full">
            <div className="w-8 h-8 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="hidden lg:block min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white leading-tight">EduSphere</p>
              <p className="text-[9px] text-blue-400 font-semibold uppercase tracking-widest">Vision AI</p>
            </div>
          </div>
        </div>

        {/* Institute label */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-blue-400/70">University Platform</p>
        </div>

        {/* Nav items */}
        <div className="flex-1 py-2 px-2 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
          <p className="hidden lg:block px-2 pt-2 pb-1 text-[8px] font-bold uppercase tracking-[0.16em]"
             style={{ color: 'rgba(255,255,255,0.25)' }}>
            Navigation
          </p>
          {NAV_ITEMS.map(item => {
            if (item.perm && !can(item.perm)) return null;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                title={item.label}
                className="nav-item"
                style={active ? {
                  background: 'rgba(59,130,246,0.18)',
                  color: '#93c5fd',
                  borderColor: 'rgba(59,130,246,0.30)',
                } : {}}
              >
                <span className="w-4 h-4 shrink-0">{item.icon}</span>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p className="text-[12px] font-medium leading-tight truncate">{item.label}</p>
                  {item.sublabel && (
                    <p className="text-[9px] leading-tight truncate opacity-50">{item.sublabel}</p>
                  )}
                </div>
                {active && <div className="hidden lg:block ml-auto w-0.5 h-4 bg-blue-400 rounded-full shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-2 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Theme toggle */}
          <div className="flex items-center justify-center lg:justify-between px-1 pt-3 pb-2">
            <span className="hidden lg:block text-[9px] uppercase tracking-widest font-semibold"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
              {isDark ? 'Night Mode' : 'Day Mode'}
            </span>
            <button
              onClick={toggle}
              title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
              className="theme-toggle"
              aria-label="Toggle theme"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>

          {/* Role badge */}
          {!openMode && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl mb-1"
                 style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="relative shrink-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="text-[11px] font-bold text-white uppercase">{role?.[0] ?? '?'}</span>
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${roleMeta?.dot ?? 'bg-gray-500'}`}
                     style={{ borderColor: 'var(--surface-1)' }} />
              </div>
              <div className="hidden lg:block min-w-0 flex-1">
                <p className={`text-[11px] font-semibold leading-tight ${roleMeta?.badge ?? 'text-gray-300'}`}>
                  {roleMeta?.label ?? role}
                </p>
                <p className="text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.30)' }}>
                  {theme === 'dark' ? 'Night' : 'Day'} Mode
                </p>
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center justify-center lg:justify-start gap-2 w-full px-2 py-2 rounded-xl transition-colors"
            style={{ color: 'rgba(255,255,255,0.30)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#f87171';
              (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)';
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden lg:block text-[11px] font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto min-w-0 transition-theme" style={{ background: 'var(--surface-0)' }}>
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
    <ThemeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ThemeProvider>
  );
}
