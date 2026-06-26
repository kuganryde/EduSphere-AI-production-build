import { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisUpdate, DetectedFace, DetectedPerson } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const ANALYSIS_INTERVAL_MS = 15000;

type SourceType = 'webcam' | 'youtube' | 'rtsp';
interface Source { type: SourceType; url?: string }

interface LiveData {
  engagement: number;
  headcount: number;
  lecturerPresent: boolean;
  sentiment: string;
  attentionRate: number | null;
  dominantEmotion: string;
  latencyMs: number | null;
  analysing: boolean;
  lastUpdated: string | null;
  error: string | null;
}

interface DetectionState {
  faces: DetectedFace[];
  persons: DetectedPerson[];
  frameWidth: number;
  frameHeight: number;
}

interface RoomCardProps {
  name: string;
  capacity: number;
  roomId?: string;
  sessionId?: string;
  onStatsUpdate?: (update: AnalysisUpdate) => void;
}

const EMOTION_COLOR: Record<string, string> = {
  happy: '#10b981', neutral: '#3b82f6', surprise: '#8b5cf6',
  sad: '#f59e0b', angry: '#ef4444', fear: '#ec4899', disgust: '#f97316',
};

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

function drawDetections(
  canvas: HTMLCanvasElement,
  detection: DetectionState,
  displayW: number,
  displayH: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = displayW;
  canvas.height = displayH;
  ctx.clearRect(0, 0, displayW, displayH);
  if (!detection.frameWidth || !detection.frameHeight) return;

  const sx = displayW / detection.frameWidth;
  const sy = displayH / detection.frameHeight;

  // Person boxes — dashed blue
  detection.persons.forEach(p => {
    const { x, y, w, h } = p.box;
    const dx = x * sx, dy = y * sy, dw = w * sx, dh = h * sy;
    ctx.strokeStyle = 'rgba(59,130,246,0.65)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(dx, dy, dw, dh);
    ctx.setLineDash([]);
    const badge = `${Math.round(p.confidence * 100)}%`;
    ctx.font = '10px monospace';
    const bw = ctx.measureText(badge).width + 8;
    ctx.fillStyle = 'rgba(59,130,246,0.75)';
    ctx.fillRect(dx, dy - 16, bw, 16);
    ctx.fillStyle = '#fff';
    ctx.fillText(badge, dx + 4, dy - 4);
  });

  // Face corner-brackets
  detection.faces.forEach(face => {
    const { x, y, w, h } = face.box;
    if (w < 10 || h < 10) return;
    const dx = x * sx, dy = y * sy, dw = w * sx, dh = h * sy;
    const color = EMOTION_COLOR[face.emotion] ?? '#94a3b8';
    const corner = Math.min(dw, dh) * 0.18;
    ctx.strokeStyle = color + (face.attention ? 'ff' : '88');
    ctx.lineWidth = 2;
    // TL
    ctx.beginPath(); ctx.moveTo(dx, dy + corner); ctx.lineTo(dx, dy); ctx.lineTo(dx + corner, dy); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(dx + dw - corner, dy); ctx.lineTo(dx + dw, dy); ctx.lineTo(dx + dw, dy + corner); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(dx, dy + dh - corner); ctx.lineTo(dx, dy + dh); ctx.lineTo(dx + corner, dy + dh); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(dx + dw - corner, dy + dh); ctx.lineTo(dx + dw, dy + dh); ctx.lineTo(dx + dw, dy + dh - corner); ctx.stroke();
    // Attention dot
    ctx.beginPath();
    ctx.arc(dx + dw - 6, dy + 6, 4, 0, Math.PI * 2);
    ctx.fillStyle = face.attention ? '#10b981' : '#ef4444';
    ctx.fill();
    // Emotion label
    const label = face.emotion;
    ctx.font = 'bold 11px monospace';
    const lw = ctx.measureText(label).width + 10;
    ctx.fillStyle = color + 'cc';
    ctx.beginPath();
    ctx.roundRect(dx, dy + dh + 2, lw, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, dx + 5, dy + dh + 14);
  });
}

export default function RoomCard({ name, capacity, roomId, sessionId, onStatsUpdate }: RoomCardProps) {
  const id = roomId ?? name.toLowerCase().replace(/\s+/g, '-');

  const [source, setSource]         = useState<Source | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [urlInput, setUrlInput]     = useState('');
  const [pendingType, setPendingType] = useState<SourceType | null>(null);
  const [rtspThumbnail, setRtspThumbnail] = useState<string | null>(null);
  const [liveData, setLiveData]     = useState<LiveData>({
    engagement: 0, headcount: 0, lecturerPresent: false, sentiment: '—',
    attentionRate: null, dominantEmotion: '—', latencyMs: null,
    analysing: false, lastUpdated: null, error: null,
  });
  const [detection, setDetection]   = useState<DetectionState>({ faces: [], persons: [], frameWidth: 0, frameHeight: 0 });

  const videoRef        = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef      = useRef<HTMLCanvasElement>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const streamRef       = useRef<MediaStream | null>(null);
  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef          = useRef<EventSource | null>(null);
  const animFrameRef    = useRef<number>(0);

  // Redraw overlay on detection change
  const redrawOverlay = useCallback(() => {
    const canvas = overlayRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const { width, height } = container.getBoundingClientRect();
    if (width && height) drawDetections(canvas, detection, Math.round(width), Math.round(height));
  }, [detection]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(redrawOverlay);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [redrawOverlay]);

  // ── Apply an analysis result (shared between webcam and RTSP paths) ──────────
  const applyAnalysis = useCallback((g: any, d: any, latency: number) => {
    const updated: LiveData = {
      engagement:     g?.engagement_score ?? 0,
      headcount:      g?.headcount ?? d?.face_count ?? 0,
      lecturerPresent:g?.lecturer_present ?? false,
      sentiment:      g?.classroom_sentiment ?? '—',
      attentionRate:  d?.degraded ? null : (d?.aggregate?.attention_rate ?? null),
      dominantEmotion:d?.aggregate?.dominant_class_emotion ?? '—',
      latencyMs:      latency,
      analysing:      false,
      lastUpdated:    new Date().toLocaleTimeString(),
      error:          (!g && !d) ? 'Analysis failed — check API keys' : null,
    };
    setLiveData(updated);

    if (d && !d.degraded && Array.isArray(d.faces)) {
      setDetection({ faces: d.faces, persons: d.persons ?? [], frameWidth: d.frame_width ?? 0, frameHeight: d.frame_height ?? 0 });
    }

    onStatsUpdate?.({
      engagement:     updated.engagement,
      headcount:      updated.headcount,
      sentiment:      updated.sentiment,
      lecturerPresent:updated.lecturerPresent,
      gestures:       g?.gestures ?? null,
      alert:          g?.alert ?? null,
      attentionRate:  updated.attentionRate,
      timestamp:      new Date().toISOString(),
    });
  }, [onStatsUpdate]);

  // ── Webcam ────────────────────────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setSource({ type: 'webcam' });
      setShowModal(false);
    } catch (err: any) {
      alert(`Camera access denied: ${err.message}`);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
  }, []);

  const runWebcamAnalysis = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setLiveData(d => ({ ...d, analysing: true, error: null }));
    const start = Date.now();
    const [geminiRes, deepfaceRes] = await Promise.allSettled([
      fetch(`${API_URL}/analyze/gemini`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frame, room_id: id, session_id: sessionId ?? null }),
      }).then(r => r.json()),
      fetch(`${API_URL}/analyze/deepface`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_b64: frame, session_id: sessionId ?? 'none', room_id: id }),
      }).then(r => r.json()),
    ]);
    applyAnalysis(
      geminiRes.status === 'fulfilled' ? geminiRes.value : null,
      deepfaceRes.status === 'fulfilled' ? deepfaceRes.value : null,
      Date.now() - start,
    );
  }, [captureFrame, id, sessionId, applyAnalysis]);

  // ── RTSP: start server-side polling + subscribe to SSE ────────────────────────
  const startRtspPolling = useCallback(async (rtspUrl: string) => {
    // Tell backend to start polling
    try {
      await fetch(`${API_URL}/camera/start-polling`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: id, rtsp_url: rtspUrl, session_id: sessionId ?? null }),
      });
    } catch (err: any) {
      console.error('start-polling failed:', err.message);
    }

    // Subscribe to SSE for analysis results
    sseRef.current?.close();
    const es = new EventSource(`${API_URL}/stream/${id}`);
    sseRef.current = es;

    es.addEventListener('analysis', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data);
        // Map SSE payload to the shapes applyAnalysis expects
        const g = {
          engagement_score:    event.engagement_score,
          headcount:           event.headcount,
          lecturer_present:    event.lecturer_present,
          classroom_sentiment: event.classroom_sentiment,
          gestures:            event.gestures,
          alert:               event.alert,
          pedagogical_note:    event.pedagogical_note,
        };
        const d = {
          face_count:   event.faces?.length ?? 0,
          faces:        event.faces ?? [],
          persons:      event.persons ?? [],
          frame_width:  event.frame_width ?? 0,
          frame_height: event.frame_height ?? 0,
          aggregate:    event.aggregate ?? {},
          degraded:     false,
        };
        applyAnalysis(g, d, event.latency_ms ?? 0);
        if (event.thumbnail_b64) {
          setRtspThumbnail(`data:image/jpeg;base64,${event.thumbnail_b64}`);
        }
        setLiveData(prev => ({ ...prev, lastUpdated: new Date().toLocaleTimeString(), latencyMs: event.latency_ms ?? prev.latencyMs }));
      } catch {}
    });

    es.addEventListener('poll_error', (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data);
        setLiveData(prev => ({ ...prev, error: event.error ?? 'RTSP analysis failed', analysing: false }));
      } catch {}
    });

    es.addEventListener('poll_stopped', () => {
      sseRef.current?.close();
      sseRef.current = null;
    });
  }, [id, sessionId, applyAnalysis]);

  const stopRtspPolling = useCallback(async () => {
    sseRef.current?.close();
    sseRef.current = null;
    try {
      await fetch(`${API_URL}/camera/stop-polling`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: id }),
      });
    } catch {}
    setRtspThumbnail(null);
  }, [id]);

  // ── Unified stop ──────────────────────────────────────────────────────────────
  const stopSource = useCallback(async () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (source?.type === 'rtsp') await stopRtspPolling();
    setSource(null);
    setDetection({ faces: [], persons: [], frameWidth: 0, frameHeight: 0 });
    setLiveData(d => ({ ...d, analysing: false }));
  }, [source, stopRtspPolling]);

  // Webcam analysis loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (source?.type === 'webcam') {
      runWebcamAnalysis();
      intervalRef.current = setInterval(runWebcamAnalysis, ANALYSIS_INTERVAL_MS);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [source, runWebcamAnalysis]);

  // Start RTSP polling when source is set
  useEffect(() => {
    if (source?.type === 'rtsp' && source.url) startRtspPolling(source.url);
    return () => { if (source?.type === 'rtsp') { stopRtspPolling(); } };
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopSource(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const engColor = liveData.engagement > 79 ? 'text-green-500' : liveData.engagement > 49 ? 'text-amber-500' : 'text-red-500';
  const engBg   = liveData.engagement > 79 ? 'bg-green-500'   : liveData.engagement > 49 ? 'bg-amber-500'   : 'bg-red-500';
  const hasBBoxes = detection.faces.length > 0 || detection.persons.length > 0;

  const handleUrlSubmit = () => {
    if (!urlInput.trim() || !pendingType) return;
    if (pendingType === 'youtube' && !getYouTubeId(urlInput)) {
      alert('Invalid YouTube URL. Use a standard youtube.com/watch?v= or youtu.be/ link.'); return;
    }
    const newSource: Source = { type: pendingType, url: urlInput.trim() };
    setSource(newSource);
    setShowModal(false);
    setUrlInput('');
    setPendingType(null);
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* ── Video panel ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full aspect-video sm:aspect-auto sm:h-[400px] xl:h-auto xl:flex-1 bg-black rounded-2xl border border-white/10 relative overflow-hidden flex flex-col shadow-lg"
      >
        {/* Live badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 ${source ? 'bg-red-600/90' : 'bg-gray-700/80'} backdrop-blur-sm rounded-md text-[10px] font-bold text-white uppercase tracking-wider border ${source ? 'border-red-500' : 'border-white/10'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${source ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            {source?.type === 'rtsp' ? 'SERVER-SIDE' : source ? (liveData.analysing ? 'ANALYSING' : 'LIVE') : 'IDLE'}
          </div>
          {source && (
            <button onClick={stopSource} className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[10px] text-gray-400 hover:text-red-400 border border-white/10 transition-colors uppercase tracking-wider">
              Stop
            </button>
          )}
        </div>

        {/* Detection badge */}
        {hasBBoxes && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            {detection.persons.length > 0 && (
              <div className="px-2 py-1 bg-blue-600/70 backdrop-blur-sm rounded-md text-[9px] font-bold text-white uppercase border border-blue-500/50">
                {detection.persons.length} bod{detection.persons.length !== 1 ? 'ies' : 'y'}
              </div>
            )}
            {detection.faces.length > 0 && (
              <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[9px] font-bold text-white uppercase border border-white/10">
                {detection.faces.length} face{detection.faces.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {liveData.error && (
          <div className="absolute top-12 left-4 right-4 z-20 px-3 py-2 bg-red-900/80 rounded-lg text-xs text-red-300 border border-red-500/30">
            ⚠ {liveData.error}
          </div>
        )}

        {/* No source */}
        {!source && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-900/20 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-gray-300 font-mono text-xs sm:text-sm tracking-widest uppercase mb-4">{name}</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={startWebcam} className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl text-blue-300 text-xs font-semibold transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Use Webcam
              </button>
              <button onClick={() => { setPendingType('youtube'); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-300 text-xs font-semibold transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-2.75 12.38 12.38 0 00-5.64 0A4.83 4.83 0 016.41 6.69 4.93 4.93 0 012 11.5v1a4.93 4.93 0 014.41 4.81 4.83 4.83 0 013.77 2.75 12.38 12.38 0 005.64 0 4.83 4.83 0 013.77-2.75A4.93 4.93 0 0122 12.5v-1a4.93 4.93 0 01-2.41-4.81zM10 15V9l5 3z"/></svg>
                YouTube URL
              </button>
              <button onClick={() => { setPendingType('rtsp'); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-xl text-green-300 text-xs font-semibold transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
                RTSP / IP Camera
              </button>
            </div>
          </div>
        )}

        {/* Webcam */}
        {source?.type === 'webcam' && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}

        {/* YouTube */}
        {source?.type === 'youtube' && source.url && (
          <div className="w-full h-full flex flex-col relative">
            <iframe
              className="flex-1 w-full"
              src={`https://www.youtube.com/embed/${getYouTubeId(source.url)}?autoplay=1&mute=1`}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
            <div className="absolute bottom-16 left-4 right-4 px-3 py-2 bg-amber-900/80 backdrop-blur-sm rounded-lg text-[10px] text-amber-300 border border-amber-500/30 font-mono">
              ⚠ YouTube streams cannot be captured for AI analysis (browser cross-origin policy). Webcam or RTSP required for live AI analysis.
            </div>
          </div>
        )}

        {/* RTSP — shows server-captured thumbnail with bounding boxes, or a waiting state */}
        {source?.type === 'rtsp' && (
          <div className="flex-1 relative flex items-center justify-center bg-black">
            {rtspThumbnail ? (
              <img
                src={rtspThumbnail}
                alt="Latest RTSP frame"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center p-6">
                <div className="w-12 h-12 border-2 border-green-500/40 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">Server-Side RTSP Polling Active</p>
                  <p className="text-gray-600 font-mono text-[10px] break-all max-w-xs">{source.url}</p>
                  <p className="text-gray-700 text-[10px] mt-2">Waiting for first frame — analysis every {ANALYSIS_INTERVAL_MS / 1000}s</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden capture canvas (webcam only) */}
        <canvas ref={captureCanvasRef} className="hidden" />

        {/* Bounding box overlay */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Status bar */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 w-[calc(100%-2rem)] md:w-auto z-10">
          <div className="px-3 py-1.5 bg-[#0b1120]/90 backdrop-blur-md border border-white/10 rounded-md text-[9px] font-mono text-gray-400 uppercase truncate">
            {source?.type === 'rtsp'
              ? 'ENGINE: SERVER-SIDE DEEPFACE MTCNN + HOG + GEMINI'
              : 'ENGINE: GEMINI 2.0 FLASH + DEEPFACE MTCNN + HOG'}
          </div>
          <div className={`px-3 py-1.5 bg-[#0b1120]/90 backdrop-blur-md border ${source ? 'border-amber-500/30' : 'border-white/10'} rounded-md text-[9px] font-mono ${source ? engColor : 'text-gray-500'} uppercase flex items-center gap-2 truncate`}>
            <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${source ? engBg : 'bg-gray-600'}`}></div>
            {source ? `ANALYSIS ACTIVE · ${ANALYSIS_INTERVAL_MS / 1000}s INTERVAL` : 'PIPELINE IDLE — SELECT A SOURCE'}
          </div>
          <div className="px-3 py-1.5 bg-[#0b1120]/90 backdrop-blur-md border border-white/10 rounded-md text-[9px] font-mono text-gray-400 uppercase flex items-center gap-2 truncate">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {liveData.latencyMs ? `LATENCY: ${liveData.latencyMs}ms` : 'AWAITING FRAME...'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 xl:gap-6 shrink-0 w-full">
        <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Class Sentiment</span>
          </div>
          <span className="text-xl font-bold text-white capitalize leading-tight">{liveData.sentiment}</span>
          {liveData.dominantEmotion !== '—' && <span className="text-xs text-gray-500 mt-1">Dominant: {liveData.dominantEmotion}</span>}
        </div>
        <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Attention Score</span>
          </div>
          <span className={`text-4xl font-bold ${source ? engColor : 'text-gray-600'} leading-none`}>
            {source ? `${liveData.engagement}%` : '—'}
          </span>
          {liveData.attentionRate !== null && <span className="text-xs text-gray-500 mt-1">DeepFace: {liveData.attentionRate}% attentive</span>}
        </div>
        <div className="bg-[#121b2f] border border-white/5 p-5 md:p-6 rounded-2xl flex flex-col justify-center shadow-sm">
          <div className="flex items-center gap-2.5 mb-3">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Subjects Present</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white leading-none">{source ? liveData.headcount : '—'}</span>
            <span className="text-base font-medium text-gray-500">/ {capacity}</span>
          </div>
          {liveData.lecturerPresent && <span className="text-xs text-green-500 mt-1">✓ Lecturer present</span>}
          {detection.faces.length > 0 && (
            <span className="text-[10px] text-gray-600 mt-0.5 font-mono">
              {detection.faces.filter(f => f.attention).length}/{detection.faces.length} attentive
            </span>
          )}
        </div>
      </div>

      {/* Source modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121b2f] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1">
              {pendingType === 'youtube' ? 'YouTube Stream' : 'RTSP / IP Camera'}
            </h3>
            <p className="text-gray-400 text-sm mb-2">
              {pendingType === 'youtube'
                ? 'Enter a YouTube video or livestream URL.'
                : 'Enter your RTSP or IP camera stream URL. The backend will capture frames server-side and stream analysis results back in real time.'}
            </p>
            {pendingType === 'rtsp' && (
              <div className="mb-4 px-3 py-2 bg-green-900/20 border border-green-500/20 rounded-lg text-[11px] text-green-400 font-mono">
                ✓ Full AI analysis (DeepFace + Gemini) runs server-side — bounding boxes and engagement data streamed via SSE
              </div>
            )}
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
              placeholder={pendingType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'rtsp://192.168.1.100:554/stream'}
              className="w-full bg-[#0b1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors mb-4 font-mono"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setUrlInput(''); setPendingType(null); }}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleUrlSubmit}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold transition-colors">
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
