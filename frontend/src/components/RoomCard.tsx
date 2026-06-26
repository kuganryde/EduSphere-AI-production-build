export default function RoomCard({ name, engagement, headcount, capacity }: { name: string, engagement: number, headcount: number, capacity: number }) {
  const engagementColor = engagement > 79 ? 'text-green-500' : engagement > 49 ? 'text-amber-500' : 'text-red-600';
  const engagementBg = engagement > 79 ? 'bg-green-500' : engagement > 49 ? 'bg-amber-500' : 'bg-red-600';
  
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="w-full aspect-video sm:aspect-auto sm:h-[400px] xl:h-auto xl:flex-1 bg-[#000000] rounded-2xl border border-white/10 relative overflow-hidden flex flex-col shadow-lg">
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600/90 backdrop-blur-sm rounded-md text-[10px] md:text-xs font-bold text-white uppercase tracking-wider z-10 shadow-sm border border-red-500">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
          LIVE
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-900/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 border border-blue-500/20">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-gray-300 font-mono text-xs sm:text-sm tracking-widest uppercase mb-3">{name}</h3>
          <p className="text-[#64748B] text-[10px] sm:text-xs font-mono max-w-sm leading-relaxed px-4 hidden sm:block">
            Please insert an RTSP streaming link, select a local hardware camera, or enter a YouTube URL below to initialize real-time classroom telemetry.
          </p>
        </div>

        {/* Overlays */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 w-[calc(100%-2rem)] md:w-auto z-10">
          <div className="px-2.5 md:px-3 py-1.5 md:py-2 bg-[#0b1120]/90 backdrop-blur-md border border-white/10 rounded-md text-[9px] md:text-[10px] font-mono text-gray-400 uppercase truncate shadow-sm">
            ENGINE: WEBLGL TENSORFLOW.JS [COCO-SSD ACTIVE]
          </div>
          <div className={`px-2.5 md:px-3 py-1.5 md:py-2 bg-[#0b1120]/90 backdrop-blur-md border border-${engagement > 79 ? 'green' : 'amber'}-500/30 rounded-md text-[9px] md:text-[10px] font-mono ${engagementColor} uppercase flex items-center gap-2 truncate shadow-sm`}>
            <div className={`w-1.5 h-1.5 shrink-0 ${engagementBg} rounded-full`}></div>
            <span className="truncate">NEURAL PIPELINE: 100% IN-BROWSER WEBLGL ACTIVE [REAL-TIME]</span>
          </div>
          <div className="px-2.5 md:px-3 py-1.5 md:py-2 bg-[#0b1120]/90 backdrop-blur-md border border-white/10 rounded-md text-[9px] md:text-[10px] font-mono text-gray-400 uppercase flex items-center gap-2 truncate shadow-sm">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="truncate">INFERENCE LATENCY: Awaiting Frame...</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:gap-6 shrink-0 w-full">
        <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
          </div>
          <div className="flex items-center gap-2.5 mb-3 relative z-10">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
            <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest truncate font-semibold">Presentation Style</span>
          </div>
          <span className="text-xl md:text-2xl font-bold text-white relative z-10 leading-tight">Dynamic / Interactive</span>
        </div>
        <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex items-center gap-2.5 mb-3 relative z-10">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest truncate font-semibold">Attention Score</span>
          </div>
          <span className={`text-3xl md:text-4xl font-bold ${engagementColor} relative z-10 leading-none`}>{engagement}%</span>
        </div>
        <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col justify-center shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div className="flex items-center gap-2.5 mb-3 relative z-10">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest truncate font-semibold">Subjects Present</span>
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-3xl md:text-4xl font-bold text-white leading-none">{headcount}</span>
            <span className="text-sm md:text-base font-medium text-gray-500">/ {capacity}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
