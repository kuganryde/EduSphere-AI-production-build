import RoomCard from './RoomCard';
import AlertBanner from './AlertBanner';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';

export default function Dashboard() {
  return (
    <div className="flex flex-col min-h-full bg-[#0b1120] w-full">
      {/* Top System Status Bar */}
      <div className="p-4 md:p-6 pb-2">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 px-4 md:px-6 py-3 rounded-xl gap-4 xl:gap-0 shadow-lg shadow-blue-900/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm font-semibold text-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              SYSTEM ONLINE
            </div>
            <div className="hidden sm:block w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-100">
              <svg className="w-4 h-4 text-white/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              Vision Engine: COCO-SSD Lightweight
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 xl:gap-6 text-xs font-medium text-white/90 uppercase tracking-wider">
            <span>LECTURER: <span className="font-bold text-white">DETECTING...</span></span>
            <span>STUDENTS: <span className="font-bold text-white">32</span></span>
            <span>CLASS: <span className="font-bold text-white">ACTIVE</span></span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-6 flex-1 flex flex-col w-full max-w-[1600px] mx-auto">
        <AlertBanner message="Engagement dropping in Room 402-B — consider an interaction" level={2} />
        
        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-6 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Lecture Hall Analysis</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="bg-blue-900/40 text-blue-300 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 border border-blue-500/30 whitespace-nowrap">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                SITUATION: Active Monitoring...
              </span>
              <span className="text-gray-400 text-sm">Monitoring engagement and hall sentiment</span>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-3 md:gap-4 w-full xl:w-auto">
            <div className="bg-[#121b2f] border border-white/5 px-4 md:px-5 py-3 rounded-xl flex flex-col flex-1 sm:flex-none sm:w-[160px] justify-center">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">PERSONS DETECTED</span>
              <div className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white leading-none">
                <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                32
              </div>
            </div>
            <div className="bg-[#121b2f] border border-white/5 px-4 md:px-5 py-3 rounded-xl flex flex-col flex-1 sm:flex-none sm:w-[160px] justify-center">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1.5">CLASS SENTIMENT</span>
              <div className="flex items-center gap-2 text-xl md:text-2xl font-bold text-white leading-none">
                <svg className="w-5 h-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Focused
              </div>
            </div>
            <button className="flex items-center justify-center gap-2 px-5 py-3 bg-[#1e293b] hover:bg-[#334155] border border-white/10 rounded-xl text-white text-sm font-medium transition-colors w-full sm:w-auto shrink-0 shadow-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Sources
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12 gap-6 w-full">
          {/* Main Video & Stats */}
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-8 xl:row-span-3 w-full">
            <RoomCard name="Room 402-B / Main Stage" engagement={84} headcount={32} capacity={34} />
          </div>

          {/* Right Column / Responsive Panels */}
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
