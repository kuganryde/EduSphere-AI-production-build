/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import OperatorMode from './components/OperatorMode';
import { Session, Alert, PedagogicalAnalysis } from './types';

export default function App() {
  const [mode, setMode] = useState<'admin' | 'operator'>('admin');
  
  // Global State (Mocked)
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [roomConfig, setRoomConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    // Example of using the VITE_API_URL environment variable for polling/websocket setup
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    console.log(`Connecting to backend at: ${API_URL}`);
    
    // Polling simulation
    const interval = setInterval(() => {
      // Simulate fetching updates from backend
      // fetch(`${API_URL}/stream/room-123`)
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (mode === 'operator') {
    return <OperatorMode onSwitch={() => setMode('admin')} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b1120] text-gray-200 overflow-hidden font-sans">
      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <nav className="w-64 border-r border-white/5 bg-[#0e1526] flex flex-col p-4 shrink-0">
          <div className="flex flex-col items-center gap-3 mb-8 mt-2">
            <div className="flex items-center gap-3 w-full px-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-xl">
                {/* Brain / AI Icon placeholder */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">EduSphere</span>
                <span className="text-xs text-blue-400 font-medium uppercase tracking-wider">Vision AI</span>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4">
            <button onClick={() => setMode('admin')} className={`flex items-center gap-4 px-4 py-3 ${mode === 'admin' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'} rounded-xl w-full transition-colors`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span className="text-sm font-medium text-left leading-tight">Real-time<br/>Dashboard</span>
            </button>
            <button className="flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl w-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              <span className="text-sm font-medium">Detailed Analytics</span>
            </button>
            <button className="flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl w-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-sm font-medium">Student Reports</span>
            </button>
            <button className="flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl w-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
              <span className="text-sm font-medium text-left leading-tight">Biometric<br/>Enrollment</span>
            </button>
            <button className="flex items-center gap-4 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl w-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              <span className="text-sm font-medium text-left leading-tight">Manual Analysis</span>
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {mode === 'admin' ? (
            <Dashboard />
          ) : (
            <OperatorMode onSwitch={() => setMode('admin')} />
          )}
        </div>
      </main>
    </div>
  );
}

