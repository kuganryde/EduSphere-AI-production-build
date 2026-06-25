export default function RoomCard({ name, engagement, headcount, capacity }: { name: string, engagement: number, headcount: number, capacity: number }) {
  const engagementColor = engagement > 79 ? 'text-green-500' : engagement > 49 ? 'text-amber-500' : 'text-red-600';
  const engagementBg = engagement > 79 ? 'bg-green-500' : engagement > 49 ? 'bg-amber-500' : 'bg-red-600';
  const emotion = engagement > 79 ? 'FOCUSED' : engagement > 49 ? 'MIXED' : 'DISTRACTED';
  
  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="h-96 bg-black rounded-2xl border border-white/10 relative overflow-hidden flex flex-col min-h-0">
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600 rounded text-xs font-bold text-white uppercase tracking-wider">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          LIVE
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <svg className="w-12 h-12 text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <h3 className="text-gray-400 font-mono text-sm tracking-widest uppercase mb-2">{name}</h3>
          <p className="text-[#334155] text-xs font-mono max-w-md leading-relaxed">
            Please insert an RTSP streaming link, select a local hardware camera, or enter a YouTube URL below to initialize real-time classroom telemetry and YOLO vision analysis.
          </p>
        </div>

        {/* Overlays */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="px-3 py-1.5 bg-black/80 border border-white/10 rounded text-[10px] font-mono text-gray-400 uppercase">
            ENGINE: WEBLGL TENSORFLOW.JS [COCO-SSD ACTIVE]
          </div>
          <div className={`px-3 py-1.5 bg-black/80 border border-${engagement > 79 ? 'green' : 'amber'}-500/30 rounded text-[10px] font-mono ${engagementColor} uppercase flex items-center gap-2`}>
            <div className={`w-1.5 h-1.5 ${engagementBg} rounded-full`}></div>
            NEURAL PIPELINE: 100% IN-BROWSER WEBLGL ACTIVE [REAL-TIME]
          </div>
          <div className="px-3 py-1.5 bg-black/80 border border-white/10 rounded text-[10px] font-mono text-gray-400 uppercase flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            INFERENCE LATENCY: Awaiting Frame...
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6 shrink-0">
        <div className="bg-[#121b2f] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            <span className="text-xs text-gray-400 uppercase tracking-widest">Presentation Style</span>
          </div>
          <span className="text-xl font-bold text-white">Dynamic / Interactive</span>
        </div>
        <div className="bg-[#121b2f] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs text-gray-400 uppercase tracking-widest">Attention Score</span>
          </div>
          <span className={`text-xl font-bold ${engagementColor}`}>{engagement}%</span>
        </div>
        <div className="bg-[#121b2f] border border-white/5 p-4 rounded-2xl flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-xs text-gray-400 uppercase tracking-widest">Subjects Present</span>
          </div>
          <span className="text-xl font-bold text-white">{headcount} / {capacity}</span>
        </div>
      </div>
    </div>
  );
}
