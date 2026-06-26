import { useState } from 'react';
import RoomCard from './RoomCard';
import AlertBanner from './AlertBanner';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';

interface LiveStats {
  engagement: number;
  headcount: number;
  sentiment: string;
  lecturerPresent: boolean;
}

export default function Dashboard() {
  const [stats, setStats] = useState<LiveStats>({
    engagement: 0, headcount: 0, sentiment: 'Awaiting...', lecturerPresent: false,
  });
  const [alerts, setAlerts] = useState([
    { id: '1', message: 'Select a camera source to begin live monitoring', level: 1 as const },
  ]);

  const dismissAlert = (id: string) =>
    setAlerts(a => a.filter(x => x.id !== id));

  const engagementColor = stats.engagement > 79 ? 'text-green-400'
    : stats.engagement > 49 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="flex flex-col min-h-full bg-[#0b1120] w-full">
      {/* Top status bar */}
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 px-4 md:px-6 py-3 rounded-xl gap-4 xl:gap-0 shadow-lg shadow-blue-900/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm font-semibold text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              SYSTEM ONLINE
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-100">
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Gemini 2.0 Flash + DeepFace
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 xl:gap-6 text-xs font-medium text-white/90 uppercase tracking-wider">
            <span>LECTURER: <span className={`font-bold ${stats.lecturerPresent ? 'text-green-300' : 'text-white'}`}>
              {stats.lecturerPresent ? 'PRESENT' : 'DETECTING...'}
            </span></span>
            <span>STUDENTS: <span className="font-bold text-white">{stats.headcount || '—'}</span></span>
            <span>ENGAGEMENT: <span className={`font-bold ${engagementColor}`}>
              {stats.engagement ? `${stats.engagement}%` : '—'}
            </span></span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 flex-1 flex flex-col w-full max-w-[1600px] mx-auto">
        {/* Alerts */}
        {alerts.map(a => (
          <AlertBanner key={a.id} message={a.message} level={a.level} onDismiss={() => dismissAlert(a.id)} />
        ))}

        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-6 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Lecture Hall Analysis</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="bg-blue-900/40 text-blue-300 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-blue-500/30 whitespace-nowrap">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {stats.engagement ? 'ACTIVE MONITORING' : 'AWAITING SOURCE'}
              </span>
              <span className="text-gray-400 text-sm">Monitoring engagement and hall sentiment</span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-3 md:gap-4 w-full xl:w-auto">
            <div className="bg-[#121b2f] border border-white/5 px-4 md:px-5 py-3 rounded-xl flex flex-col flex-1 sm:flex-none sm:w-[160px] justify-center">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">PERSONS DETECTED</span>
              <div className={`flex items-center gap-2 text-xl md:text-2xl font-bold leading-none ${stats.headcount ? 'text-white' : 'text-gray-600'}`}>
                {stats.headcount || '—'}
              </div>
            </div>
            <div className="bg-[#121b2f] border border-white/5 px-4 md:px-5 py-3 rounded-xl flex flex-col flex-1 sm:flex-none sm:w-[160px] justify-center">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">CLASS SENTIMENT</span>
              <div className={`flex items-center gap-2 text-xl md:text-2xl font-bold leading-none capitalize ${stats.sentiment !== 'Awaiting...' ? 'text-white' : 'text-gray-600'}`}>
                {stats.sentiment}
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-6 w-full">
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-8 xl:row-span-3 w-full">
            <RoomCard
              name="Room 402-B / Main Stage"
              capacity={34}
              roomId="room-402-b"
              onStatsUpdate={setStats}
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-4 w-full">
            <SessionPanel />
          </div>
          <div className="md:col-span-1 lg:col-span-1 xl:col-span-4 w-full">
            <EngagementChart />
          </div>
          <div className="md:col-span-2 lg:col-span-1 xl:col-span-4 w-full">
            <GestureBreakdown />
          </div>
        </div>
      </div>
    </div>
  );
}
