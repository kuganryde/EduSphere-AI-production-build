import { useState, lazy, Suspense, useEffect } from 'react';
import { AnalysisUpdate } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DemoProvider, useDemoMode } from './context/DemoContext';
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
const IconCamera = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const IconBarChart = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconBell = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
const IconGear = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconCpu = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
      d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m-4-4v2M3 9v6m0-6H1m18 0h2m-2 6h2M3 15v2a2 2 0 002 2h2m-4-4H1m18 4h2m-4 0v2a2 2 0 01-2 2h-2m4-4h2M9 21h6m-6 0v-2m6 2v-2M9 21H7a2 2 0 01-2-2v-2m10 4h2a2 2 0 002-2v-2m-4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10a2 2 0 002 2h4a2 2 0 002-2z" />
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

/* ── Sidebar section nav structure ───────────────────────────── */
interface NavSection {
  sectionLabel: string;
  items: { id: Page | 'camera' | 'alerts' | 'settings' | 'syshealth'; label: string; sub: string; perm?: string; Icon: () => JSX.Element; badge?: string; disabled?: boolean }[];
}

/* ── Greeting helper ─────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

/* ── TopNav ──────────────────────────────────────────────────── */
function TopNav({
  page, liveStats, onToggleTheme, isDark, role, openMode, onLogout, alertCount,
}: {
  page: Page;
  liveStats: AnalysisUpdate | null;
  onToggleTheme: () => void;
  isDark: boolean;
  role: string | null;
  openMode: boolean;
  onLogout: () => void;
  alertCount: number;
}) {
  const { isDemoMode, setDemoMode } = useDemoMode();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const roleMeta = ROLE_CONFIG[role ?? 'viewer'];
  const isLive   = !!liveStats?.headcount;

  return (
    <div className="top-nav" style={{ position: 'relative', height: 52 }}>
      {/* Logo ────────────────────────────── */}
      <div className="flex items-center gap-2.5 shrink-0" style={{ minWidth: 180 }}>
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', filter: 'blur(6px)', opacity: 0.55, transform: 'scale(1.1)' }} />
          <div className="relative w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg,#2563eb,#6366f1)', boxShadow: '0 2px 12px rgba(37,99,235,0.5),inset 0 1px 0 rgba(255,255,255,0.15)' }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-black leading-tight tracking-tight" style={{ color: '#f0f6ff' }}>EduSphere AI</p>
          <p className="text-[8px] font-bold uppercase tracking-[0.20em]" style={{ color: 'rgba(99,102,241,0.75)' }}>Classroom Intelligence</p>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-5 shrink-0 mx-1" style={{ background: 'var(--border-1)' }} />

      {/* Greeting */}
      <div className="hidden md:flex flex-col shrink-0 px-1">
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-0)' }}>
          {getGreeting()}! {openMode ? '' : roleMeta?.label ?? ''}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
          EduSphere AI Classroom Intelligence Platform
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* System status chips */}
      <div className="hidden lg:flex items-center gap-2 mr-3">
        <div className="stat-chip" style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
          <span className="pulse-dot" style={{ color: '#10b981', width: 6, height: 6 }} />
          <span style={{ fontSize: 10 }}>AI Online</span>
        </div>
        <div className="stat-chip" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)', color: 'var(--text-1)' }}>
          <span style={{ fontSize: 10 }}>Cameras</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-0)' }}>1/4</span>
        </div>
        {liveStats?.attentionRate != null && (
          <div className="stat-chip" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)', color: 'var(--text-1)' }}>
            <span style={{ fontSize: 10 }}>Attention</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#22d3ee' }}>{liveStats.attentionRate}%</span>
          </div>
        )}
      </div>

      {/* Live stats chips */}
      {isLive && (
        <div className="hidden lg:flex items-center gap-1 mr-2">
          {[
            { val: `${liveStats?.engagement ?? 0}%`, label: 'ENG',  color: liveStats!.engagement > 70 ? '#10b981' : liveStats!.engagement > 40 ? '#f59e0b' : '#ef4444' },
            { val: `${liveStats?.headcount ?? 0}`,   label: 'HEAD', color: '#3b82f6' },
          ].map(m => (
            <div key={m.label} className="stat-chip" style={{ background: `${m.color}0f`, border: `1px solid ${m.color}28` }}>
              <span className="text-[9px] font-bold uppercase tracking-wider font-mono" style={{ color: `${m.color}99` }}>{m.label}</span>
              <span className="text-xs font-bold font-mono" style={{ color: m.color }}>{m.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-5 shrink-0 mx-1" style={{ background: 'var(--border-0)' }} />

      {/* Session status */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
           style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: isLive ? 'var(--success)' : 'var(--text-3)', ...(isLive ? { animation: 'pulse-dot 1.8s ease-in-out infinite' } : {}) }} />
        <span className="text-[9px] font-bold uppercase tracking-[0.10em]" style={{ color: isLive ? 'var(--success)' : 'var(--text-3)' }}>
          {isLive ? '● LIVE SESSION' : '○ No Session'}
        </span>
      </div>

      {/* AI status */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
           style={{ background: 'var(--surface-3)', border: '1px solid var(--border-0)' }}>
        <div className="relative flex items-center justify-center w-2 h-2">
          {isLive && <span className="absolute inset-0 rounded-full" style={{ background: 'var(--success)', animation: 'pulse-ring 1.4s ease-out infinite', borderRadius: '50%' }} />}
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: isLive ? 'var(--success)' : 'var(--text-3)' }} />
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.10em]" style={{ color: isLive ? 'var(--success)' : 'var(--text-3)' }}>
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
      <div className="w-px h-5 shrink-0 mx-1" style={{ background: 'var(--border-0)' }} />

      {/* Demo/Real toggle */}
      <button
        onClick={() => setDemoMode(!isDemoMode)}
        title={isDemoMode ? 'Switch to Real mode' : 'Switch to Demo mode'}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all shrink-0"
        style={{
          background:  isDemoMode ? 'rgba(245,158,11,0.14)' : 'var(--surface-3)',
          border:      `1px solid ${isDemoMode ? 'rgba(245,158,11,0.48)' : 'var(--border-1)'}`,
          color:       isDemoMode ? '#fbbf24' : 'var(--text-3)',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        {isDemoMode
          ? <><span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#fbbf24' }} /><span className="text-[9px] font-bold uppercase tracking-wider">Demo</span></>
          : <><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-3)' }} /><span className="text-[9px] font-bold uppercase tracking-wider">Real</span></>
        }
      </button>

      {/* Notification bell */}
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 relative"
        style={{ color: alertCount > 0 ? '#f59e0b' : 'var(--text-2)', border: '1px solid transparent' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}
        title="Notifications"
      >
        <IconBell />
        {alertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ background: '#ef4444', boxShadow: '0 0 6px rgba(239,68,68,0.5)' }}>
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </button>

      {/* Theme toggle */}
      <button onClick={onToggleTheme} className="theme-toggle shrink-0" title={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'} aria-label="Toggle theme">
        {isDark ? <IconSun /> : <IconMoon />}
      </button>

      {/* User chip */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl shrink-0"
           style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)' }}>
        {roleMeta && (
          <>
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold"
                 style={{ background: 'var(--surface-4)', color: openMode ? 'var(--cyan)' : roleMeta.color }}>
              {openMode ? '○' : (role ?? 'V')[0].toUpperCase()}
            </div>
            <p className="hidden lg:block text-[10px] font-semibold leading-tight"
               style={{ color: openMode ? 'var(--cyan)' : roleMeta.color }}>
              {openMode ? 'Open Access' : roleMeta.label}
            </p>
          </>
        )}
        <button
          onClick={onLogout}
          className="flex items-center justify-center transition-colors"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
          title="Sign out"
        >
          <IconSignOut />
        </button>
      </div>
    </div>
  );
}

/* ── AppShell ────────────────────────────────────────────────── */
function AppShell() {
  const { isAuthenticated, role, logout, can, openMode } = useAuth();
  const { toggle, isDark }                               = useTheme();
  const [page, setPage]           = useState<Page>('dashboard');
  const [liveStats, setLiveStats] = useState<AnalysisUpdate | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  // Count alerts from live stats
  useEffect(() => {
    if (liveStats?.alert) {
      setAlertCount(c => c + 1);
    }
  }, [liveStats?.alert]);

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

  /* ── Sidebar nav sections ──────────────────────────────────── */
  const NAV_SECTIONS: NavSection[] = [
    {
      sectionLabel: 'MONITORING',
      items: [
        { id: 'dashboard', label: 'Dashboard',      sub: 'Live overview',    Icon: IconDashboard },
        { id: 'operator',  label: 'Live Monitoring', sub: 'Operator display', perm: 'operator_mode', Icon: IconMonitor },
        { id: 'camera',    label: 'Camera Manager', sub: 'Source control',   Icon: IconCamera },
      ],
    },
    {
      sectionLabel: 'ANALYTICS',
      items: [
        { id: 'analytics', label: 'Student Analytics',   sub: 'Individual data',   perm: 'view_analytics', Icon: IconUsers },
        { id: 'analytics', label: 'Lecturer Analytics',  sub: 'Lecturer insights', perm: 'view_analytics', Icon: IconBarChart },
        { id: 'analytics', label: 'Classroom Analytics', sub: 'Room-level data',   perm: 'view_analytics', Icon: IconBarChart },
        { id: 'analytics', label: 'AI Insights',         sub: 'Smart analysis',    perm: 'view_analytics', Icon: IconBarChart },
      ],
    },
    {
      sectionLabel: 'MANAGEMENT',
      items: [
        { id: 'reports',  label: 'Session Management', sub: 'Active sessions',  perm: 'view_reports',   Icon: IconDoc },
        { id: 'reports',  label: 'Reports & Export',   sub: 'Download data',    perm: 'view_reports',   Icon: IconDoc },
        { id: 'alerts',   label: 'Alert Center',       sub: 'Active alerts',    Icon: IconBell,         badge: alertCount > 0 ? String(alertCount > 9 ? '9+' : alertCount) : undefined },
      ],
    },
    {
      sectionLabel: 'SYSTEM',
      items: [
        { id: 'syshealth', label: 'System Health', sub: liveStats ? 'HEALTHY' : 'IDLE', Icon: IconCpu },
        { id: 'settings',  label: 'Settings',      sub: 'Coming soon', Icon: IconGear, disabled: true },
        { id: 'audit',     label: 'Users & Roles', sub: 'Access control', perm: 'view_audit_logs', Icon: IconUsers },
        { id: 'audit',     label: 'Audit Logs',    sub: 'Activity log',   perm: 'view_audit_logs', Icon: IconAudit },
      ],
    },
  ];

  // Map sidebar IDs to actual pages
  const resolveId = (id: string): Page => {
    if (id === 'camera' || id === 'alerts') return 'dashboard';
    if (id === 'syshealth') return 'dashboard';
    if (id === 'settings') return 'dashboard';
    return id as Page;
  };

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
        alertCount={alertCount}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <nav
          className="w-[56px] lg:w-[220px] flex flex-col shrink-0 transition-theme overflow-hidden"
          style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border-0)' }}
        >
          {/* Institute name pill */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-3"
               style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-1.5 h-1.5 rounded-full neon-pulse" style={{ background: 'var(--brand)', boxShadow: '0 0 6px var(--brand-glow)' }} />
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] gradient-text">University Platform</p>
          </div>

          {/* Nav sections */}
          <div className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto thin-scroll">
            {NAV_SECTIONS.map((section) => (
              <div key={section.sectionLabel} className="mb-1">
                <p className="hidden lg:block px-2 pt-2 pb-1.5 text-[8px] font-black uppercase tracking-[0.22em]"
                   style={{ color: 'rgba(255,255,255,0.18)' }}>
                  {section.sectionLabel}
                </p>
                {section.items.map((item, idx) => {
                  if (item.perm && !can(item.perm)) return null;
                  if (item.disabled) {
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        title={item.label}
                        className="s-item"
                        style={{ opacity: 0.35, cursor: 'not-allowed' }}
                      >
                        <span className="w-4 h-4 shrink-0"><item.Icon /></span>
                        <div className="hidden lg:flex min-w-0 flex-1 items-center justify-between">
                          <div>
                            <p className="text-[12px] font-semibold leading-tight truncate">{item.label}</p>
                            <p className="text-[9px] leading-tight truncate" style={{ opacity: 0.40 }}>{item.sub}</p>
                          </div>
                          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}>
                            SOON
                          </span>
                        </div>
                      </div>
                    );
                  }
                  const active = page === resolveId(item.id) && item.id !== 'camera' && item.id !== 'alerts' && item.id !== 'syshealth';
                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      onClick={() => !item.disabled && setPage(resolveId(item.id))}
                      title={item.label}
                      className={`s-item w-full text-left${active ? ' active' : ''}`}
                    >
                      <span className="w-4 h-4 shrink-0" style={{ color: active ? 'var(--brand)' : 'inherit' }}>
                        <item.Icon />
                      </span>
                      <div className="hidden lg:flex min-w-0 flex-1 items-center justify-between">
                        <div>
                          <p className="text-[12px] font-semibold leading-tight truncate">{item.label}</p>
                          <p className="text-[9px] leading-tight truncate" style={{ opacity: 0.40 }}>{item.sub}</p>
                        </div>
                        {/* Badge for alert count or system health */}
                        {item.badge && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.30)' }}>
                            {item.badge}
                          </span>
                        )}
                        {item.id === 'syshealth' && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: liveStats ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: liveStats ? '#10b981' : 'rgba(255,255,255,0.30)', border: liveStats ? '1px solid rgba(16,185,129,0.30)' : '1px solid rgba(255,255,255,0.08)' }}>
                            {liveStats ? 'HEALTHY' : 'IDLE'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-2 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* EduSphere branding card */}
            <div className="hidden lg:block mx-0 mb-2 mt-3 p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd' }}>EduSphere AI</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>University Edition</p>
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>v2.2.0</p>
                </div>
                <div style={{ fontSize: 28 }}>🎓</div>
              </div>
            </div>

            {role && ROLE_CONFIG[role] && (
              <div className="flex items-center gap-2 px-2 py-2 rounded-xl mb-1 mt-1"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                       style={{ background: `${ROLE_CONFIG[role].color}18`, border: `1px solid ${ROLE_CONFIG[role].color}35`, color: ROLE_CONFIG[role].color }}>
                    {role[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 live-dot"
                       style={{ background: ROLE_CONFIG[role].dot, borderColor: 'var(--surface-1)' }} />
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <p className="text-[11px] font-semibold leading-tight truncate" style={{ color: ROLE_CONFIG[role].color }}>
                    {openMode ? 'Open Access' : ROLE_CONFIG[role].label}
                  </p>
                  <p className="text-[9px] font-mono leading-tight" style={{ color: 'rgba(255,255,255,0.22)' }}>
                    v4 · {isDark ? 'Night' : 'Day'} Mode
                  </p>
                </div>
              </div>
            )}

            {/* Need Help? */}
            <div className="hidden lg:block mt-1 px-2">
              <a href="#" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                 onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#60a5fa')}
                 onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)')}>
                <svg width={10} height={10} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Need Help?
              </a>
            </div>

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
        <DemoProvider>
          <AppShell />
        </DemoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
