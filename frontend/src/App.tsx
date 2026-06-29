import { useState, lazy, Suspense } from 'react';
import { AnalysisUpdate } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';

const Dashboard    = lazy(() => import('./components/Dashboard'));
const OperatorMode = lazy(() => import('./components/OperatorMode'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage   = lazy(() => import('./pages/ReportsPage'));
const AuditLogPage  = lazy(() => import('./pages/AuditLogPage'));

type Page = 'dashboard' | 'operator' | 'analytics' | 'reports' | 'audit';

const Spinner = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function NavButton({
  icon, label, active, onClick, requirePerm, hidden,
}: {
  icon: React.ReactNode; label: React.ReactNode; active: boolean;
  onClick: () => void; requirePerm?: string; hidden?: boolean;
}) {
  const { can } = useAuth();
  if (hidden) return null;
  if (requirePerm && !can(requirePerm)) return null;
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-2 lg:py-3 ${
        active
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
      } rounded-xl w-auto md:w-full transition-colors shrink-0`}
    >
      <span className="w-5 h-5 shrink-0">{icon}</span>
      <span className="hidden lg:block text-sm font-medium text-left leading-tight whitespace-nowrap">{label}</span>
    </button>
  );
}

function AppShell() {
  const { isAuthenticated, role, logout, can } = useAuth();
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

  return (
    <div className="flex flex-col h-screen bg-[#0b1120] text-gray-200 overflow-hidden font-sans">
      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-20 lg:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-[#0e1526] flex flex-row md:flex-col p-2 md:p-4 shrink-0 overflow-x-auto md:overflow-visible no-scrollbar">
          {/* Logo */}
          <div className="flex flex-row md:flex-col items-center gap-3 md:mb-8 md:mt-2 shrink-0 mr-4 md:mr-0">
            <div className="flex items-center gap-3 w-full px-2">
              <div className="w-10 h-10 shrink-0 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">EduSphere</span>
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Vision AI</span>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <div className="flex flex-row md:flex-col gap-2 md:mt-4 overflow-x-auto flex-1">
            <NavButton
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
              label={<>Real-time<br/>Dashboard</>} active={page === 'dashboard'} onClick={() => setPage('dashboard')}
            />
            <NavButton
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              label="Operator Mode" active={page === 'operator'} onClick={() => setPage('operator')}
              requirePerm="operator_mode"
            />
            <NavButton
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              label="Detailed Analytics" active={page === 'analytics'} onClick={() => setPage('analytics')}
              requirePerm="view_analytics"
            />
            <NavButton
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              label="Student Reports" active={page === 'reports'} onClick={() => setPage('reports')}
              requirePerm="view_reports"
            />
            <NavButton
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
              label="Audit Log" active={page === 'audit'} onClick={() => setPage('audit')}
              requirePerm="view_audit_logs"
            />
            <NavButton
              icon={<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>}
              label={<>Biometric<br/>Enrollment</>} active={false} onClick={() => {}}
              hidden={true}
            />
          </div>

          {/* User/role badge + logout */}
          <div className="hidden md:flex flex-col gap-2 mt-auto pt-4 border-t border-white/5">
            <div className="px-2 py-2 rounded-xl bg-white/5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                {role?.[0] ?? '?'}
              </div>
              <div className="hidden lg:block flex-1 min-w-0">
                <p className="text-white text-xs font-semibold capitalize truncate">{role ?? 'Unknown'}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Access level</p>
              </div>
            </div>
            {can('view_dashboard') && (
              <button onClick={logout} className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2 text-gray-600 hover:text-red-400 hover:bg-red-900/10 rounded-xl text-xs transition-colors">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="hidden lg:block">Sign Out</span>
              </button>
            )}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1120]">
              <Spinner />
            </div>
          }>
            {page === 'dashboard'  && <Dashboard onLiveStats={setLiveStats} />}
            {page === 'analytics'  && <AnalyticsPage />}
            {page === 'reports'    && <ReportsPage />}
            {page === 'audit'      && <AuditLogPage />}
          </Suspense>
        </div>
      </main>
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
