import { useState, useRef, useEffect, useCallback } from 'react';
import { AnalysisUpdate, DetectedFace, DetectedPerson } from '../types';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WEBCAM_INTERVAL_MS  = 5_000;   // local capture — fast
const UPLOAD_INTERVAL_MS  = 6_000;   // video file

type SourceType = 'webcam' | 'youtube' | 'rtsp' | 'upload';
interface Source { type: SourceType; url?: string; fileName?: string }

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

import { TriggerSource } from './Dashboard';

interface RoomCardProps {
  name: string;
  capacity: number;
  roomId?: string;
  sessionId?: string;
  onStatsUpdate?: (update: AnalysisUpdate) => void;
  triggerSource?: TriggerSource | null;
  onRtspThumbnail?: (thumbnail: string) => void;
  externalFileInput?: React.RefObject<HTMLInputElement | null>;
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

export default function RoomCard({ name, capacity, roomId, sessionId, onStatsUpdate, triggerSource, onRtspThumbnail, externalFileInput }: RoomCardProps) {
  const id = roomId ?? name.toLowerCase().replace(/\s+/g, '-');

  const [source, setSource]         = useState<Source | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [urlInput, setUrlInput]     = useState('');
  const [pendingType, setPendingType] = useState<SourceType | null>(null);
  const [rtspThumbnail, setRtspThumbnail] = useState<string | null>(null);
  const [uploadSrc, setUploadSrc]   = useState<string | null>(null);
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
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const uploadObjRef    = useRef<string | null>(null); // object URL for cleanup

  // ── External trigger from Dashboard camera strip ──────────────
  useEffect(() => {
    if (!triggerSource) return;

    // Inline cleanup via refs — avoids stale closure on stopSource
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    sseRef.current?.close(); sseRef.current = null;
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; videoRef.current.src = ''; }
    if (uploadObjRef.current) { URL.revokeObjectURL(uploadObjRef.current); uploadObjRef.current = null; }
    setUploadSrc(null);
    setSource(null);
    setDetection({ faces: [], persons: [], frameWidth: 0, frameHeight: 0 });

    // stop=true means Dashboard wants the feed stopped (Stop Feed button)
    if (triggerSource.stop) return;

    if (triggerSource.type === 'webcam') {
      startWebcam();
    } else if (triggerSource.type === 'rtsp' && triggerSource.url) {
      // setSource triggers the source-watching useEffect which calls startRtspPolling
      setSource({ type: 'rtsp', url: triggerSource.url });
    } else if (triggerSource.type === 'upload' && triggerSource.file) {
      const objUrl = URL.createObjectURL(triggerSource.file);
      uploadObjRef.current = objUrl;
      setUploadSrc(objUrl);
      setSource({ type: 'upload', fileName: triggerSource.file.name });
    }
  }, [triggerSource?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

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
      engagement:       updated.engagement,
      headcount:        updated.headcount,
      sentiment:        updated.sentiment,
      lecturerPresent:  updated.lecturerPresent,
      gestures:         g?.gestures ?? null,
      alert:            g?.alert ?? null,
      attentionRate:    updated.attentionRate,
      timestamp:        new Date().toISOString(),
      emotionBreakdown: d && !d.degraded ? (d.aggregate?.emotion_breakdown ?? null) : null,
      dominantEmotion:  d && !d.degraded ? (d.aggregate?.dominant_class_emotion ?? null) : null,
      pedagogicalNote:  g?.pedagogical_note ?? null,
      faceEmotions:     d && !d.degraded && Array.isArray(d.faces)
        ? d.faces.map((f: any) => ({ emotion: f.emotion, attention: f.attention, confidence: f.confidence }))
        : [],
    });

    // Save complete snapshot to backend when a session is active
    if (sessionId && id) {
      const body = {
        session_id:       sessionId,
        room_id:          id,
        engagement_score: updated.engagement,
        headcount:        updated.headcount,
        lecturer_present: updated.lecturerPresent,
        classroom_sentiment: updated.sentiment,
        gestures:         g?.gestures ?? null,
        alert_level:      g?.alert ? (g.alert === 'lecturer_absent' ? 3 : 2) : null,
        alert_type:       g?.alert ?? null,
        attention_rate:   updated.attentionRate,
        dominant_emotion: d && !d.degraded ? (d.aggregate?.dominant_class_emotion ?? null) : null,
        emotion_breakdown: d && !d.degraded ? (d.aggregate?.emotion_breakdown ?? null) : null,
        pedagogical_note: g?.pedagogical_note ?? null,
      };
      fetch(`${API_URL}/analytics/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body),
      }).catch(() => {}); // fire-and-forget
    }
  }, [onStatsUpdate, sessionId, id]);

  // ── Webcam ────────────────────────────────────────────────────────────────────
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width:     { ideal: 1280, min: 640 },
          height:    { ideal: 720,  min: 480 },
          frameRate: { ideal: 30,   min: 15  },
          facingMode: 'user',
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
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
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
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
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
          const uri = `data:image/jpeg;base64,${event.thumbnail_b64}`;
          setRtspThumbnail(uri);
          onRtspThumbnail?.(uri);
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
        method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ room_id: id }),
      });
    } catch {}
    setRtspThumbnail(null);
  }, [id]);

  // ── Video file upload ────────────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadObjRef.current) URL.revokeObjectURL(uploadObjRef.current);
    const objUrl = URL.createObjectURL(file);
    uploadObjRef.current = objUrl;
    setUploadSrc(objUrl);
    setSource({ type: 'upload', fileName: file.name });
    e.target.value = '';
  }, []);

  // ── Unified stop ──────────────────────────────────────────────────────────────
  const stopSource = useCallback(async () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (source?.type === 'rtsp') await stopRtspPolling();
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; videoRef.current.src = ''; }
    if (uploadObjRef.current) { URL.revokeObjectURL(uploadObjRef.current); uploadObjRef.current = null; }
    setUploadSrc(null);
    setSource(null);
    setDetection({ faces: [], persons: [], frameWidth: 0, frameHeight: 0 });
    setLiveData(d => ({ ...d, analysing: false }));
  }, [source, stopRtspPolling]);

  // Webcam / upload analysis loop — both use captureFrame from videoRef
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (source?.type === 'webcam' || source?.type === 'upload') {
      const intervalMs = source.type === 'webcam' ? WEBCAM_INTERVAL_MS : UPLOAD_INTERVAL_MS;
      // Small delay on first run so the video element has time to render a frame
      const firstRun = setTimeout(() => runWebcamAnalysis(), 800);
      intervalRef.current = setInterval(runWebcamAnalysis, intervalMs);
      return () => { clearTimeout(firstRun); if (intervalRef.current) clearInterval(intervalRef.current); };
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
    <div className="flex flex-col gap-4 w-full h-full">
      {/* ── Video panel ──────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl relative overflow-hidden flex flex-col shadow-lg"
        style={{ background: '#000', border: '1px solid var(--border-0)', minHeight: 340, flex: 1 }}
      >
        {/* Live badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 ${source ? 'bg-red-600/90' : 'bg-gray-700/80'} backdrop-blur-sm rounded-md text-[10px] font-bold text-white uppercase tracking-wider border ${source ? 'border-red-500' : 'border-white/10'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${source ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
            {source?.type === 'rtsp' ? 'SERVER-SIDE' : source?.type === 'upload' ? 'UPLOAD' : source ? (liveData.analysing ? 'ANALYSING' : 'LIVE') : 'IDLE'}
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

        {/* No source — point user to strip above */}
        {!source && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <svg className="w-8 h-8" style={{ color: 'rgba(59,130,246,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm text-white/80">{name}</p>
              <p className="text-[11px] mt-1 text-white/30">
                Select a camera from the strip above to begin AI analysis
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-3.5 h-3.5 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span className="text-[10px] text-white/25 uppercase tracking-widest font-mono">Camera strip above</span>
            </div>
          </div>
        )}

        {/* Webcam */}
        {source?.type === 'webcam' && (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}

        {/* Uploaded video */}
        {source?.type === 'upload' && (
          <div className="flex-1 relative">
            <video ref={videoRef} src={uploadSrc ?? undefined} autoPlay playsInline muted loop className="w-full h-full object-contain" />
            <div className="absolute bottom-4 left-4 px-2 py-1 bg-black/70 rounded text-[9px] text-purple-300 font-mono truncate max-w-[60%]">
              {source.fileName}
            </div>
          </div>
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
                className="w-full h-full"
                style={{ objectFit: 'cover', imageRendering: 'auto' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-center p-6">
                <div className="w-12 h-12 border-2 border-green-500/40 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div>
                  <p className="text-green-400 font-mono text-xs tracking-widest uppercase mb-1">Server-Side RTSP Polling Active</p>
                  <p className="text-gray-600 font-mono text-[10px] break-all max-w-xs">{source.url}</p>
                  <p className="text-gray-700 text-[10px] mt-2">Waiting for first frame — analysis every 8s</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input for video upload (also handled externally via externalFileInput) */}
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />

        {/* Hidden capture canvas (webcam + upload) */}
        <canvas ref={captureCanvasRef} className="hidden" />

        {/* Bounding box overlay */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Status bar */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 w-auto z-10">
          <div className="overlay-bar">
            {source?.type === 'rtsp' ? 'Server-Side · DeepFace MTCNN + HOG + Gemini'
              : source?.type === 'upload' ? 'Upload · Gemini 2.0 Flash + DeepFace MTCNN'
              : 'Gemini 2.0 Flash + DeepFace MTCNN + HOG'}
          </div>
          <div className="overlay-bar">
            <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${source ? engBg : 'bg-gray-600'}`} />
            {source ? `Analysis Active · ${source.type === 'webcam' ? WEBCAM_INTERVAL_MS : source.type === 'upload' ? UPLOAD_INTERVAL_MS : 8_000}ms interval` : 'Pipeline idle'}
            {liveData.latencyMs ? ` · ${liveData.latencyMs}ms` : ''}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 shrink-0 w-full">
        {[
          {
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
            label: 'Sentiment',
            value: liveData.sentiment,
            sub: liveData.dominantEmotion !== '—' ? `Dominant: ${liveData.dominantEmotion}` : null,
            color: 'var(--brand)',
            active: liveData.sentiment !== '—',
          },
          {
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
            label: 'Engagement',
            value: source ? `${liveData.engagement}%` : '—',
            sub: liveData.attentionRate !== null ? `DeepFace: ${liveData.attentionRate}% attentive` : null,
            color: liveData.engagement > 79 ? 'var(--success)' : liveData.engagement > 49 ? 'var(--warning)' : 'var(--danger)',
            active: !!source,
          },
          {
            icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
            label: 'Present',
            value: source ? `${liveData.headcount} / ${capacity}` : '—',
            sub: liveData.lecturerPresent ? '✓ Lecturer detected' : detection.faces.length > 0 ? `${detection.faces.filter(f => f.attention).length}/${detection.faces.length} attentive` : null,
            color: 'var(--success)',
            active: !!source,
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4 flex flex-col transition-theme"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border-0)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: 'var(--text-2)' }}>{stat.icon}</span>
              <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-2)' }}>
                {stat.label}
              </span>
            </div>
            <span className="text-xl font-bold leading-none capitalize"
                  style={{ color: stat.active ? stat.color : 'var(--text-3)' }}>
              {stat.value}
            </span>
            {stat.sub && <span className="text-[10px] mt-1" style={{ color: 'var(--text-2)' }}>{stat.sub}</span>}
          </div>
        ))}
      </div>

      {/* Source modal (YouTube only — RTSP is handled by Dashboard strip) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <div className="rounded-2xl p-6 w-full max-w-md shadow-2xl fade-up"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)' }}>
            <h3 className="font-bold text-lg mb-1" style={{ color: 'var(--text-0)' }}>
              {pendingType === 'youtube' ? 'YouTube Stream' : 'RTSP / IP Camera'}
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
              {pendingType === 'youtube'
                ? 'Enter a YouTube video or livestream URL.'
                : 'Enter your RTSP or IP camera stream URL.'}
            </p>
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
              placeholder={pendingType === 'youtube' ? 'https://youtube.com/watch?v=...' : 'rtsp://192.168.1.100:554/stream'}
              className="field font-mono text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowModal(false); setUrlInput(''); setPendingType(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', color: 'var(--text-1)' }}>
                Cancel
              </button>
              <button onClick={handleUrlSubmit}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-semibold transition-colors">
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
