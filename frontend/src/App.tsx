import { useState, lazy, Suspense } from 'react';
import { AnalysisUpdate } from './types';

const Dashboard = lazy(() => import('./components/Dashboard'));
const OperatorMode = lazy(() => import('./components/OperatorMode'));

export default function App() {
  const [mode, setMode] = useState<'admin' | 'operator'>('admin');
  const [liveStats, setLiveStats] = useState<AnalysisUpdate | null>(null);

  if (mode === 'operator') {
    return (
      <div className="h-screen bg-[#0b1120] text-gray-200 font-sans overflow-hidden flex flex-col">
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <OperatorMode onSwitch={() => setMode('admin')} liveStats={liveStats} capacity={34} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b1120] text-gray-200 overflow-hidden font-sans">
      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar Nav */}
        <nav className="w-full md:w-20 lg:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-[#0e1526] flex flex-row md:flex-col p-2 md:p-4 shrink-0 overflow-x-auto md:overflow-visible no-scrollbar">
          <div className="flex flex-row md:flex-col items-center gap-3 md:mb-8 md:mt-2 shrink-0 mr-4 md:mr-0">
            <div className="flex items-center gap-3 w-full px-2">
              <div className="w-10 h-10 shrink-0 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">EduSphere</span>
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Vision AI</span>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-2 md:mt-4 overflow-x-auto flex-1">
            <button onClick={() => setMode('admin')} className={`flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-2 lg:py-3 ${mode === 'admin' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'} rounded-xl w-auto md:w-full transition-colors shrink-0`}>
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span className="hidden lg:block text-sm font-medium text-left leading-tight whitespace-nowrap">Real-time<br/>Dashboard</span>
            </button>
            <button onClick={() => setMode('operator')} className="flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-2 lg:py-3 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent rounded-xl w-auto md:w-full transition-colors shrink-0">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="hidden lg:block text-sm font-medium whitespace-nowrap">Operator Mode</span>
            </button>
            <button className="flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-2 lg:py-3 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent rounded-xl w-auto md:w-full transition-colors shrink-0">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden lg:block text-sm font-medium whitespace-nowrap">Student Reports</span>
            </button>
            <button className="flex items-center justify-center lg:justify-start gap-4 px-3 lg:px-4 py-2 lg:py-3 text-gray-400 hover:text-white hover:bg-white/5 border border-transparent rounded-xl w-auto md:w-full transition-colors shrink-0">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
              <span className="hidden lg:block text-sm font-medium text-left leading-tight whitespace-nowrap">Biometric<br/>Enrollment</span>
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto relative">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1120]">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Dashboard onLiveStats={setLiveStats} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
