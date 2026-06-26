export default function SessionPanel() {
  return (
    <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl shadow-sm w-full h-full flex flex-col">
      <h2 className="text-base font-semibold text-white mb-5 flex items-center justify-between shrink-0">
        Manage Session
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      </h2>
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Room Name</label>
          <input type="text" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="e.g. Room 402-B" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Lecturer Name</label>
          <input type="text" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="e.g. Dr. Smith" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Course Code</label>
            <input type="text" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="e.g. CS101" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Capacity</label>
            <input type="number" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner" placeholder="e.g. 50" />
          </div>
        </div>
        <div className="flex justify-between items-center bg-[#0b1120] px-4 py-3.5 rounded-xl border border-white/5 mt-auto shadow-inner">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Active Session Time</span>
          <span className="font-mono text-blue-400 font-bold text-sm tracking-widest">00:45:12</span>
        </div>
        <div className="flex gap-3 pt-4">
          <button className="flex-1 px-4 py-3 bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600/20 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider">Start</button>
          <button className="flex-1 px-4 py-3 bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600/20 rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider">Stop</button>
        </div>
        <button className="w-full mt-2 px-4 py-3 bg-[#1e293b] border border-white/5 text-white hover:bg-[#334155] rounded-xl text-sm font-semibold transition-colors uppercase tracking-wider shadow-sm">Export Report</button>
      </div>
    </div>
  );
}
