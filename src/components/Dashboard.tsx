import RoomCard from './RoomCard';
import AlertBanner from './AlertBanner';
import EngagementChart from './EngagementChart';
import GestureBreakdown from './GestureBreakdown';
import SessionPanel from './SessionPanel';

export default function Dashboard() {
  return (
    <div className="flex flex-col h-full bg-[#0b1120]">
      {/* Top Banner */}
      <div className="h-12 bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-700 flex items-center justify-between px-6 shrink-0 m-4 mb-2 rounded-xl">
        <div className="flex items-center gap-6 text-sm font-semibold text-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            SYSTEM ONLINE
          </div>
          <div className="flex items-center gap-2 border-l border-white/20 pl-6">
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Vision Engine: COCO-SSD Lightweight
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-white/90 uppercase tracking-wider text-xs">
          <span>LECTURER: <span className="font-bold text-white">DETECTING...</span></span>
          <span>STUDENTS: <span className="font-bold text-white">32</span></span>
          <span>CLASS STATE: <span className="font-bold text-white">ACTIVE</span></span>
        </div>
      </div>

      <div className="px-6 py-2 flex-1 flex flex-col min-h-0 overflow-y-auto">
        <AlertBanner message="Engagement dropping in Room 402-B — consider an interaction" level={2} />
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6 shrink-0 mt-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Lecture Hall Analysis</h1>
            <div className="flex items-center gap-3">
              <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 border border-blue-500/20">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                SITUATION: Active Monitoring...
              </span>
              <span className="text-gray-400 text-sm">Monitoring engagement and hall sentiment</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Configure Sources
            </button>
            <div className="bg-[#121b2f] border border-white/5 px-6 py-2 rounded-xl flex flex-col">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">PERSONS DETECTED</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-white">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                32
              </div>
            </div>
            <div className="bg-[#121b2f] border border-white/5 px-6 py-2 rounded-xl flex flex-col">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">LECTURE SENTIMENT</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-white">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Focused
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 shrink-0 pb-6">
          
          {/* Left Column (Video + Stats) */}
          <div className="lg:col-span-8 flex flex-col gap-6 min-h-0">
            <RoomCard name="Room 402-B / Main Stage" engagement={84} headcount={32} capacity={34} />
          </div>

          {/* Right Column (Controls & Analytics) */}
          <div className="lg:col-span-4 flex flex-col gap-6 min-h-0">
            <SessionPanel />
            <EngagementChart />
            <GestureBreakdown />
          </div>

        </div>
      </div>
    </div>
  );
}
