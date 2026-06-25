export default function SessionPanel() {
  return (
    <div className="bg-[#121b2f] border border-white/5 p-5 rounded-2xl">
      <h2 className="text-sm font-semibold text-white mb-4">Manage Session</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Room Name</label>
          <input type="text" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Room 402-B" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Lecturer Name</label>
          <input type="text" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Dr. Smith" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Course Code</label>
            <input type="text" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. CS101" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Capacity</label>
            <input type="number" className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. 50" />
          </div>
        </div>
        <div className="flex justify-between items-center bg-[#0b1120] p-3 rounded-xl border border-white/5">
          <span className="text-xs text-gray-400">Active Session Time</span>
          <span className="font-mono text-blue-400 font-medium">00:45:12</span>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="flex-1 px-4 py-2 bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600/20 rounded-xl text-sm font-medium transition-colors">Start</button>
          <button className="flex-1 px-4 py-2 bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600/20 rounded-xl text-sm font-medium transition-colors">Stop</button>
        </div>
        <button className="w-full mt-2 px-4 py-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors">Export Report</button>
      </div>
    </div>
  );
}
