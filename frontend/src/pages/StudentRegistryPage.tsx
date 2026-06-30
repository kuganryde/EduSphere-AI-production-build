import { useState, useEffect, useRef, useCallback } from 'react';
import { Student } from '../types';
import { getAuthHeader } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function StudentRegistryPage() {
  const [students, setStudents]     = useState<Student[]>([]);
  const [name, setName]             = useState('');
  const [studentId, setStudentId]   = useState('');
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [search, setSearch]         = useState('');

  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/students`, { headers: getAuthHeader() });
      const data = await res.json();
      if (Array.isArray(data)) setStudents(data);
    } catch {}
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const startWebcam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamActive(true);
    } catch (e: any) {
      setError(`Camera access denied: ${e.message}`);
    }
  };

  useEffect(() => {
    if (webcamActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [webcamActive]);

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setWebcamActive(false);
  }, []);

  useEffect(() => () => stopWebcam(), [stopWebcam]);

  const captureFace = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = 200;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    setCapturedFace(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]);
    stopWebcam();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const dataUrl = evt.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        canvas.width = 200; canvas.height = 200;
        const ctx = canvas.getContext('2d')!;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, 200, 200);
        setCapturedFace(canvas.toDataURL('image/jpeg', 0.88).split(',')[1]);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    setError(null); setSuccess(null);
    if (!name.trim() || !studentId.trim()) {
      setError('Name and Student ID are required.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ name: name.trim(), student_id: studentId.trim(), face_b64: capturedFace }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Registration failed');
      setName(''); setStudentId(''); setCapturedFace(null);
      setSuccess(`${json.name} registered successfully.`);
      await loadStudents();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from the registry?`)) return;
    await fetch(`${API_URL}/students/${id}`, {
      method: 'DELETE', headers: getAuthHeader(),
    });
    await loadStudents();
  };

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="flex flex-col h-full overflow-auto thin-scroll"
      style={{ background: 'var(--surface-0)', padding: '24px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-0)', margin: 0 }}>
          Student Registry
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
          Register students with a face photo so they can be identified automatically in live feeds.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Registration form ─────────────────────────────────────────── */}
        <div className="e-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Register New Student
          </p>

          {/* Face capture area */}
          <div
            style={{
              width: '100%', aspectRatio: '1', background: 'var(--surface-3)',
              border: '1px dashed var(--border-1)', borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, overflow: 'hidden', position: 'relative',
            }}
          >
            {webcamActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Face guide circle */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '55%', height: '55%', borderRadius: '50%',
                  border: '2px dashed rgba(59,130,246,0.6)', pointerEvents: 'none',
                }} />
                <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button
                    onClick={captureFace}
                    style={{
                      padding: '8px 20px', background: '#2563eb', color: '#fff',
                      border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Capture
                  </button>
                  <button
                    onClick={stopWebcam}
                    style={{
                      padding: '8px 14px', background: 'rgba(0,0,0,0.55)', color: '#fff',
                      border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : capturedFace ? (
              <>
                <img
                  src={`data:image/jpeg;base64,${capturedFace}`}
                  alt="Captured face"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => setCapturedFace(null)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    padding: '4px 10px', background: 'rgba(0,0,0,0.65)',
                    color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Retake
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={24} height={24} fill="none" stroke="rgba(59,130,246,0.6)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
                  Add a face photo for automatic detection
                </p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button
                    onClick={startWebcam}
                    style={{
                      padding: '6px 14px', background: 'rgba(37,99,235,0.15)',
                      border: '1px solid rgba(37,99,235,0.35)', color: '#60a5fa',
                      borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Use Webcam
                  </button>
                  <label style={{
                    padding: '6px 14px', background: 'var(--surface-2)',
                    border: '1px solid var(--border-1)', color: 'var(--text-2)',
                    borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Form fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                Full Name *
              </label>
              <input
                className="field"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Ahmad Razali"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                Student ID *
              </label>
              <input
                className="field font-mono"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="e.g. S2024001"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 11, color: '#f87171' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: 11, color: '#10b981' }}>
              ✓ {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              marginTop: 16, width: '100%', padding: '10px 0',
              background: loading ? 'rgba(37,99,235,0.4)' : '#2563eb',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 13,
              fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Registering…' : 'Register Student'}
          </button>

          {!capturedFace && (
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
              Adding a face photo enables automatic identification during live classroom monitoring.
            </p>
          )}
        </div>

        {/* ── Student list ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Registered', value: students.length, color: '#3b82f6' },
              { label: 'With Photo', value: students.filter(s => s.face_b64).length, color: '#10b981' },
              { label: 'No Photo', value: students.filter(s => !s.face_b64).length, color: '#f59e0b' },
            ].map(stat => (
              <div
                key={stat.label}
                className="e-card"
                style={{ flex: 1, padding: '12px 16px', textAlign: 'center' }}
              >
                <p style={{ fontSize: 22, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}
              width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="field"
              style={{ paddingLeft: 32 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or student ID…"
            />
          </div>

          {/* Table */}
          <div className="e-card" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>👤</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                  {students.length === 0 ? 'No students registered yet' : 'No results found'}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {students.length === 0 ? 'Register your first student using the form on the left.' : 'Try a different search term.'}
                </p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-0)' }}>
                    {['Photo', 'Name', 'Student ID', 'Registered', ''].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 16px', textAlign: h === '' ? 'right' : 'left',
                          fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                          textTransform: 'uppercase', letterSpacing: '0.12em',
                          background: 'var(--surface-1)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--border-0)' : 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {/* Photo */}
                      <td style={{ padding: '10px 16px', width: 52 }}>
                        {s.face_b64 ? (
                          <img
                            src={`data:image/jpeg;base64,${s.face_b64}`}
                            alt={s.name}
                            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(59,130,246,0.35)' }}
                          />
                        ) : (
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: 'var(--surface-3)', border: '2px solid var(--border-1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 700, color: 'var(--text-2)',
                          }}>
                            {s.name[0]?.toUpperCase()}
                          </div>
                        )}
                      </td>
                      {/* Name */}
                      <td style={{ padding: '10px 16px' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>{s.name}</p>
                        {!s.face_b64 && (
                          <span style={{ fontSize: 9, color: '#f59e0b', fontWeight: 600 }}>No photo — detection disabled</span>
                        )}
                      </td>
                      {/* Student ID */}
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600,
                          color: 'var(--brand)', background: 'rgba(37,99,235,0.1)',
                          padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(37,99,235,0.2)',
                        }}>
                          {s.student_id}
                        </span>
                      </td>
                      {/* Date */}
                      <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          style={{
                            padding: '4px 10px', background: 'transparent',
                            border: '1px solid rgba(239,68,68,0.25)', color: '#f87171',
                            borderRadius: 6, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Note about face matching */}
          <div style={{
            padding: '10px 14px', background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10,
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 700, color: '#60a5fa' }}>Face Detection:</span> Registered students with face photos will be identified automatically in the Live Dashboard. Student name and ID will appear on their bounding box in the video feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
