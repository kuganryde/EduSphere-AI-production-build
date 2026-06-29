import { useState, lazy, Suspense, useEffect } from 'react';
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
    <div className="w-7 h-7 border-2 rounded-full animate-spin"
         style={{ borderColor: 'var(--border-1)', borderTopColor: 'var(--brand)' }} />
  </div>
);

/* ── SVG icon helpers ─────────────────────────────────────────── */
const IconDashboard = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const IconMonitor = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const IconBarChart = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconDoc = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconAudit = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const IconSun = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M5.64 18.36l-.71.71m12.73 0-.71-.71M5.64 5.64l-.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
  </svg>
);
const IconMoon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
  </svg>
);
const IconSignOut = () => (
  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const IconBell = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const NAV: { id: Page; label: string; sub: string; perm?: string; Icon: () => JSX.Element }[] = [
  { id: 'dashboard', label: 'Dashboard',   sub: 'Live monitoring', Icon: IconDashboard },
  { id: 'operator',  label: 'Operator',    sub: 'Display mode', perm: 'operator_mode', Icon: IconMonitor },
  { id: 'analytics', label: 'Analytics',   sub: 'Trends & rooms', perm: 'view_analytics', Icon: IconBarChart },
  { id: 'reports',   label: 'Reports',     sub: 'Session history', perm: 'view_reports', Icon: IconDoc },
  { id: 'audit',     label: 'Audit Log',   sub: 'Admin only', perm: 'view_audit_logs', Icon: IconAudit },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  admin:    { label: 'Administrator', color: '#f87171', dot: '#ef4444' },
  operator: { label: 'Operator',      color: '#fbbf24', dot: '#f59e0b' },
  viewer:   { label: 'Viewer',        color: '#60a5fa', dot: '#3b82f6' },
};

const PAGE_LABEL: Record<Page, string> = {
  dashboard: 'Live Dashboard',
  operator:  'Operator Display',
  analytics: 'Analytics',
  reports:   'Reports',
  audit:     'Audit Log',
};

/* ── TopNav ──────────────────────────────────────────────────── */
function TopNav({
  page, liveStats, onToggleTheme, isDark, role, openMode, onLogout,
}: {
  page: Page;
  liveStats: AnalysisUpdate | null;
  onToggleTheme: () => void;
  isDark: boolean;
  role: string | null;
  openMode: boolean;
  onLogout: () => void;
}) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const roleMeta = ROLE_CONFIG[role ?? 'viewer'];
  const isLive   = !!liveStats?.headcount;

  return (
    <div className="top-nav">
      {/* Logo ────────────────────────────── */}
      <div className="flex items-center gap-2.5 shrink-0 mr-4" style={{ minWidth: 0 }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #2563eb, #6366f1)', boxShadow: '0 2px 10px rgba(37,99,235,0.4)' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-bold leading-tight" style={{ color: 'rgba(240,246,255,0.92)' }}>EduSphere AI</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(99,102,241,0.75)' }}>
            Classroom Intelligence
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 shrink-0" style={{ background: 'var(--border-1)' }} />

      {/* Page breadcrumb */}
      <div className="hidden md:flex items-center gap-1.5 px-2 shrink-0">
        <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>
          /
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
          {PAGE_LABEL[page]}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Live stats (when active) ───── */}
      {isLive && (
        <div className="hidden lg:flex items-center gap-1 mr-2">
          {[
            { val: `${liveStats?.engagement ?? 0}%`, label: 'ENG', color: liveStats!.engagement > 70 ? 'var(--success)' : liveStats!.engagement > 40 ? 'var(--warning)' : 'var(--danger)' },
            { val: `${liveStats?.headcount ?? 0}`, label: 'HEAD', color: 'var(--brand)' },
            { val: liveStats?.attentionRate != null ? `${liveStats.attentionRate}%` : '—', label: 'ATT', color: 'var(--cyan)' },
          ].map(m => (
            <div
              key={m.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}
            >
              <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                {m.label}
              </span>
              <span className="text-xs font-bold" style={{ color: m.color }}>{m.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* AI status */}
      <div
        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
        style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}
      >
        <div className="relative flex items-center justify-center w-2 h-2">
          {isLive && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: 'var(--success)',
                animation: 'pulse-ring 1.4s ease-out infinite',
                borderRadius: '50%',
              }}
            />
          )}
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isLive ? 'var(--success)' : 'var(--text-3)' }}
          />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.10em]"
              style={{ color: isLive ? 'var(--success)' : 'var(--text-3)' }}>
          {isLive ? 'AI ACTIVE' : 'AI IDLE'}
        </span>
      </div>

      {/* Clock */}
      <div className="hidden md:flex flex-col items-end shrink-0 px-1">
        <span className="text-xs font-bold" style={{ color: 'var(--text-0)', fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <span className="text-[9px] font-medium" style={{ color: 'var(--text-3)' }}>
          {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 shrink-0 ml-1" style={{ background: 'var(--border-0)' }} />

      {/* Notification */}
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
        style={{ color: 'var(--text-2)', border: '1px solid transparent' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-0)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
        title="Notifications"
      >
        <IconBell />
      </button>

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className="theme-toggle shrink-0"
        title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
        aria-label="Toggle theme"
      >
        {isDark ? <IconSun /> : <IconMoon />}
      </button>

      {/* Role badge */}
      {!openMode && roleMeta && (
        <div
          className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-xl shrink-0"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)' }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
            style={{ background: 'var(--surface-4)', color: roleMeta.color }}
          >
            {(role ?? 'V')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-semibold leading-tight" style={{ color: roleMeta.color }}>
              {roleMeta.label}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="ml-1 flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
            title="Sign out"
          >
            <IconSignOut />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── AppShell ────────────────────────────────────────────────── */
function AppShell() {
  const { isAuthenticated, role, logout, can, openMode } = useAuth();
  const { toggle, isDark }                               = useTheme();
  const [page, setPage]       = useState<Page>('dashboard');
  const [liveStats, setLiveStats] = useState<AnalysisUpdate | null>(null);

  if (!isAuthenticated) return <LoginModal />;

  if (page === 'operator') {
    return (
      <div className="h-screen overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
        <Suspense fallback={<Spinner />}>
          <OperatorMode onSwitch={() => setPage('dashboard')} liveStats={liveStats} capacity={34} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden transition-theme"
         style={{ background: 'var(--surface-0)', color: 'var(--text-0)' }}>

      {/* ── Top Navigation ─────────────────────────────────────── */}
      <TopNav
        page={page}
        liveStats={liveStats}
        onToggleTheme={toggle}
        isDark={isDark}
        role={role}
        openMode={openMode}
        onLogout={logout}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <nav
          className="w-[60px] lg:w-[210px] flex flex-col shrink-0 transition-theme"
          style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border-0)' }}
        >
          {/* Institute label */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-3"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--brand)' }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.16em]"
               style={{ color: 'rgba(99,102,241,0.65)' }}>
              University Platform
            </p>
          </div>

          {/* Nav items */}
          <div className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto no-scrollbar">
            <p className="hidden lg:block px-2 pt-1 pb-2 text-[8px] font-bold uppercase tracking-[0.18em]"
               style={{ color: 'rgba(255,255,255,0.20)' }}>
              Navigation
            </p>
            {NAV.map(item => {
              if (item.perm && !can(item.perm)) return null;
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  title={item.label}
                  className={`nav-item${active ? ' active' : ''}`}
                >
                  <span className="w-4 h-4 shrink-0"><item.Icon /></span>
                  <div className="hidden lg:block min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-tight truncate">{item.label}</p>
                    <p className="text-[9px] leading-tight truncate opacity-50">{item.sub}</p>
                  </div>
                  {active && <div className="hidden lg:block ml-auto w-0.5 h-4 rounded-full shrink-0"
                                   style={{ background: 'var(--brand)' }} />}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-2 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Role badge */}
            {!openMode && role && ROLE_CONFIG[role] && (
              <div className="flex items-center gap-2 px-2 py-2 rounded-xl mb-1 mt-3"
                   style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                       style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: ROLE_CONFIG[role].color }}>
                    {role[0].toUpperCase()}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: ROLE_CONFIG[role].dot, borderColor: 'var(--surface-1)' }}
                  />
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p className="text-[11px] font-semibold leading-tight truncate"
                     style={{ color: ROLE_CONFIG[role].color }}>
                    {ROLE_CONFIG[role].label}
                  </p>
                  <p className="text-[9px] leading-tight" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    {isDark ? 'Night' : 'Day'} Mode
                  </p>
                </div>
              </div>
            )}

            {/* Sign out (mobile/compact) */}
            <button
              onClick={logout}
              title="Sign out"
              className="lg:hidden flex items-center justify-center w-full px-2 py-2 rounded-xl mt-2 transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.10)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <IconSignOut />
            </button>
          </div>
        </nav>

        {/* ── Main Content ──────────────────────────────────────── */}
        <main className="flex-1 overflow-auto min-w-0" style={{ background: 'var(--surface-0)' }}>
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
        </main>
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
