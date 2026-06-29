# EduSphere AI

<!-- markdownlint-disable MD033 -->
<div align="center">

## Real-time classroom intelligence platform for universities

Live emotion analytics · HSEmotion VA sentiment · Gemini 2.0 Flash · RTSP / Webcam / Upload · Demo mode · Tailscale mesh networking · Night & Day theme · RBAC · PDPA-compliant

---

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![YOLOv11](https://img.shields.io/badge/YOLOv11n--Pose-Ultralytics-00BFFF)](https://ultralytics.com)
[![HSEmotion](https://img.shields.io/badge/HSEmotion-enet__b2__8-FF6B35)](https://github.com/HSE-asavchenko/face-emotion-recognition)
[![Tailscale](https://img.shields.io/badge/Tailscale-Mesh_VPN-1A1A2E?logo=tailscale&logoColor=white)](https://tailscale.com)

</div>

---

## Overview

EduSphere AI is a full-stack university classroom monitoring platform. It captures live video from onboard webcams, RTSP IP cameras, or uploaded recordings, runs dual AI analysis (Google Gemini 2.0 Flash + HSEmotion enet_b2_8 + YOLOv11n-pose), and streams real-time engagement, emotion, and attention data back to educators — all within a Guard Up-style dashboard designed for institutional use.

The platform ships with a **Demo Mode** that simulates a full live classroom environment without any cameras, and a **Tailscale mesh networking** integration that allows the Python AI sidecar to run on the university LAN (where it can reach RTSP cameras directly) while remaining securely accessible to the cloud backend.

| Component | Technology | Purpose |
| --------- | ---------- | ------- |
| **EduSphere Web Dashboard** | React 18 · Node.js · Supabase | Full-stack session management, historical analytics, RBAC, PDPA |
| **Vision Sidecar** | Python · FastAPI · YOLOv11n-pose · HSEmotion ONNX | AI inference service — emotion, attention, PDPA face blur |
| **RydeGate Classroom Intelligence** | Python · Streamlit · YOLOv11-Pose · YOLO-World · HSEmotion | Standalone local monitor — VA sentiment, gesture detection, object awareness |

---

## Features

### Live Camera Sources

| Source | How it works |
| ------ | ------------ |
| **Onboard Webcam** | `getUserMedia` in-browser capture — frames sent to Gemini + HSEmotion |
| **RTSP / IP Camera** | Backend polls camera via Python sidecar on the local network (Tailscale) |
| **Video Upload** | Local recording played back in browser; analyzed on the same 15 s interval |

### Demo Mode

A fully simulated classroom environment controlled by a single toggle in the top nav bar.

- **Real / Demo toggle** — amber `DEMO` badge when active, grey `REAL` when not
- **MockFeedPanel** — animated classroom grid (3 rows × 8 seats, 22 occupied) with emotion-coloured avatar circles, attention dots, FPS counter, scan-line animation, and lecturer area
- **Deterministic mock stream** — `useMockStream` emits ticks every 3.5 s through a 36-tick / 6-phase cycle (~2.1 min loop)
- **6 classroom phases**: focused → energetic → peak engagement → high distraction → recovery → refocused — headcount, engagement %, sentiment, and alert type all change per phase
- **Same pipeline as real mode** — mock data flows through `handleStatsUpdate`, all charts, KPI cards, emotion timeline, and alert log update identically
- **Alert simulation** — `high_distraction`, `low_attendance`, `lecturer_absent` alerts fire at the correct phases with full dismiss support
- **Demo session** — Dr. Sarah Chen · CS302 · started 23 min ago — shown in session info bar
- **Demo export** — downloads a stub JSON with `{ session, note: 'Demo export — synthetic data only', snapshots: [] }`
- **Persisted to localStorage** — demo mode survives page refresh

### Guard Up-Style Dashboard

- **Camera strip at top** — one tile per source (Webcam, CCTV Cam 1, CCTV Cam 2, Upload, + Add RTSP). Click any tile to switch instantly. LIVE badge + glow ring on the active feed.
- **Stop Feed bar** — appears below the strip when a feed is active; one click to stop.
- **Main video panel** — bounding-box overlay: emotion-coloured person boxes with gesture icon, VA valence badge, and posture bar. Replaced by `MockFeedPanel` in demo mode.
- **Quick-stats sidebar** — Engagement %, Headcount / Capacity, Attention %, Lecturer Presence — updated every 15 s.
- **Session Panel** — start / stop recorded sessions with lecturer name, course code, capacity.

### Real-time Emotion Analytics

- **Live Emotion Panel** — 7-emotion horizontal progress bars (happy · neutral · surprise · sad · angry · fear · disgust) with per-face chips showing emotion, attention status (✓ / ✗), classroom state, and detected objects.
- **Valence-Arousal Panel** — continuous V/A coordinates from Russell's circumplex model; classroom state badge (Participatory / Attentive / Distressed / Disengaged / Neutral).
- **Gemini Pedagogical Note** — Gemini's actionable sentence for the educator (e.g. "Consider a short quiz to re-engage the back rows").
- **Emotion Timeline Chart** — per-emotion line chart growing in real time over the session duration.
- **Engagement Chart** — dual-line area chart (Engagement % + Attention %).
- **Gesture Breakdown** — donut chart: writing notes · looking at board · hands raised · using phone · heads down.
- **Alert Log** — level-coded (info / warning / critical) alerts for high distraction, low attendance, lecturer absence; real-time SSE push + dismiss. Demo alerts supported independently.

### Analytics & Reports

- **7-day engagement trend** — AreaChart across all sessions
- **Room engagement snapshot** — BarChart per configured room
- **Per-session emotion breakdown** — horizontal BarChart showing average emotion distribution across the full session
- **Session reports** — timeline sparkline, gesture totals, sentiment distribution, alert count; JSON export

### Theme System

- **Night mode** (default) and **Day mode** toggle in the sidebar footer
- Full CSS custom-property theme: `--surface-0..4`, `--text-0..3`, `--border-0..2`, `--brand`, `--success/warning/danger` and their `-dim` variants
- Sidebar stays dark in both themes (institutional aesthetic)
- Persisted to `localStorage`

### Security & Compliance

- **RBAC** — `ADMIN_KEY`, `OPERATOR_KEY`, `VIEWER_KEY` env vars; open mode when no keys are set (auto-login for development / demos)
- **PDPA masking** — Gaussian blur applied to face ROIs in the Python sidecar before thumbnails reach the browser; unblurred frame stays server-side for Gemini only
- **Audit log** — every session start/stop and role-sensitive action written to `audit_logs` table
- **Supabase RLS** — Row Level Security on all tables; backend uses the service-role key (bypasses RLS server-side only)

---

## Vision Sidecar v2

The Python FastAPI service (`deepface-service/`) handles all computer vision inference. It replaced DeepFace + TensorFlow with a lighter, faster stack.

### Model Stack

| Model | Purpose | Size |
| ----- | ------- | ---- |
| **YOLOv11n-pose** | Person detection + 17 COCO keypoints | ~6 MB |
| **HSEmotion enet_b2_8** | Face emotion recognition (AffectNet-8, ONNX) | ~28 MB |

Total Docker image: ~900 MB (down from ~3.5 GB with DeepFace + TensorFlow).

### Inference Pipeline

```text
Frame
  └── YOLOv11n-pose → person bboxes + 17 COCO keypoints
        └── keypoints 0–4 (nose, eyes, ears) → face bounding box
              └── HSEmotion enet_b2_8 → 8 AffectNet emotions + probabilities
                    └── HS_TO_STD mapping → standard emotion string
                          └── emotion_breakdown → percentages 0–100
```

### Attention Detection

Attention is determined from skeleton keypoints — no ML classifier needed:

- **Attentive**: nose confidence > 0.35 AND (left_eye OR right_eye confidence > 0.35) → facing camera
- **Inattentive**: head turned, looking down, or keypoints not visible

### PDPA Compliance

- `thumbnail_b64` — Gaussian-blurred face ROIs; safe for frontend display
- `frame_b64` — unblurred original; stays on the Node backend for Gemini analysis only, never forwarded to the browser

### API Contract

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/health` | GET | Service status + model load state |
| `/analyze` | POST | Analyze a base64-encoded frame (webcam / upload) |
| `/analyze/rtsp` | POST | Capture + analyze one frame from an RTSP URL |

---

## Tailscale Networking

RTSP cameras on a university LAN are not reachable from cloud servers. EduSphere solves this by running the Python sidecar **on the local network** and connecting it to the cloud backend via Tailscale.

### Option A — Tailscale Funnel (quick start)

Expose the local sidecar as a public HTTPS URL via Tailscale's relay. No changes to Render needed.

```bash
# On the local machine with cameras
tailscale up
tailscale funnel 8000
# → https://your-machine.tailnet-name.ts.net
```

Set on Render `edusphere-backend`:

```text
DEEPFACE_API_URL = https://your-machine.tailnet-name.ts.net
```

### Option B — Tailscale Mesh (production)

Both the Render backend container and the local sidecar join the same private tailnet. The backend communicates with the sidecar via its Tailscale IP (`100.x.x.x`). No public exposure at all.

```text
[IP Cameras on University LAN]
         ↓ RTSP (direct — same network)
[Local Machine — Python Sidecar + Tailscale]  100.x.x.x:8000
         ↓ WireGuard mesh (private)
[Render — Node Backend + Tailscale in Docker]
         ↓
[Frontend — Netlify]
```

The backend `Dockerfile` installs Tailscale and runs `tailscale-start.sh` before starting Node — it joins the tailnet as an ephemeral node on startup and leaves automatically when the container stops.

Required env vars on Render `edusphere-backend`:

```text
TAILSCALE_AUTH_KEY = tskey-auth-xxxx   (ephemeral + reusable, from Tailscale dashboard)
DEEPFACE_API_URL   = http://100.x.x.x:8000
DEEPFACE_API_KEY   = your-sidecar-key
```

### Why local sidecar is better

| Feature | Cloud sidecar | Local sidecar + Tailscale |
| ------- | ------------- | ------------------------- |
| RTSP access | No (can't reach LAN) | Yes (direct) |
| Latency | High (video traverses internet twice) | Low (only JSON results go to cloud) |
| Bandwidth | Streams full frames to cloud | ~2 KB/tick JSON only |
| Cost | Render Standard plan | Free (runs on existing hardware) |
| GPU | No | Yes (use local GPU if available) |

---

## RydeGate Classroom Intelligence (`rydegate_classroom.py`)

A standalone Python/Streamlit application that runs on any machine with a camera or RTSP connection. All analysis runs locally — no cloud services required.

### Non-blocking Video Pipeline

`cv2.VideoCapture` in RTSP mode blocks for several seconds on slow or unstable streams, freezing the UI. RydeGate solves this with two complementary capture classes:

**`FrameBuffer`** — for file, webcam, and YouTube sources:

```text
FrameBuffer (daemon thread)
  ├── _resolve()    URL/yt-dlp resolution — never blocks the main thread
  ├── cap.grab()    non-blocking grab; retrieve() only when a frame is needed
  ├── queue.Queue(maxsize=2)   drop oldest, always keep newest frame
  └── exponential backoff reconnect (1 s → 10 s)

Main Streamlit loop
  └── buf.read_latest()  →  queue.get_nowait() — returns instantly or (False, None)
```

**`VLCCapture`** — for RTSP / RTSPS streams:
Uses `libvlc` memory-rendering callbacks (`lock / unlock / display`) so VLC decodes the stream in its own thread and writes directly into a shared ctypes pixel buffer. The main thread reads a copy via `np.frombuffer(...).copy()` — zero blocking, no GIL contention.

### Emotion Engine — HSEmotion EfficientNet-B2

**HSEmotion `enet_b2_8`** is an EfficientNet-B2 model trained on AffectNet-8 (450 000+ labeled images) and exported to ONNX for fast CPU inference.

- Returns 8 FER+ class probabilities per face crop (Anger, Contempt, Disgust, Fear, Happiness, Neutral, Sadness, Surprise)
- Probability-weighted average over Russell's circumplex coordinates gives continuous **Valence** (−1 → +1) and **Arousal** (−1 → +1) per student

### Valence-Arousal Sentiment (Russell Circumplex)

| Classroom State | Valence | Arousal | Meaning |
| --------------- | ------- | ------- | ------- |
| **Participatory** | ≥ +0.25 | ≥ +0.20 | Energised, positive — ideal for debates, group work |
| **Attentive** | ≥ +0.20 | < +0.20 | Calm focus — ideal for direct instruction |
| **Distressed** | < −0.15 | ≥ +0.30 | Frustration or anxiety — pause and check comprehension |
| **Disengaged** | < −0.15 | < +0.15 | Low energy, low affect — energiser recommended |
| **Neutral** | — | — | Baseline / transitional |

### Skeleton Gesture Detection — YOLOv11n-Pose

| Gesture | Detection rule |
| ------- | -------------- |
| ✋ Raised Hand | Wrist Y < shoulder Y − 30 % body height |
| 😔 Head Down | Nose Y > shoulder Y + 18 % body height |
| ✍ Writing | Both wrists in desk zone (55–100 % body height) |
| 📱 Phone | Single wrist at desk zone near body centreline |
| 👁 Looking Forward | None of the above |

### Multi-Signal Engagement

```text
engagement = attention × 0.30
           + VA_valence_score × 0.35
           + positive_gesture_rate × 0.20
           + posture_score × 0.15
```

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser  (React 18 · Vite · Tailwind v4)                       │
│  Dashboard · AlertLog · LiveEmotionPanel · EmotionTimelineChart  │
│  EngagementChart · GestureBreakdown · SessionPanel · Reports     │
│                                                                 │
│  DemoContext → Real/Demo toggle                                 │
│  MockFeedPanel → simulated classroom (demo mode only)           │
└───────────────┬───────────────────────────┬─────────────────────┘
                │  REST + SSE               │  getUserMedia (webcam)
                ▼                           │
┌──────────────────────────┐               │
│  Node.js / Express       │◄──────────────┘
│  backend (Render — Docker)│
│  + Tailscale (mesh VPN)  │
│                          │
│  /analyze/gemini  ──►  Gemini 2.0 Flash API
│  /analyze/deepface ──► Python FastAPI sidecar
│  /camera/start-polling   │
│  /stream/:roomId (SSE)   │
│  /analytics/*            │
│  /sessions  /alerts      │
│  /reports   /audit       │
└──────────┬───────────────┘
           │  Supabase PostgreSQL
           ▼
┌──────────────────────────┐
│  Supabase                │
│  rooms · sessions        │
│  engagement_snapshots    │  ← emotion_breakdown JSONB (v3)
│  alerts · audit_logs     │  ← pedagogical_note TEXT (v3)
│  consent_records         │
└──────────────────────────┘

── Vision Sidecar (on university LAN) ───────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│  Python FastAPI Sidecar v2                                      │
│  Local machine · Tailscale IP 100.x.x.x:8000                   │
│                                                                 │
│  YOLOv11n-pose → 17 COCO keypoints                             │
│   └── head keypoints → face bbox + attention bool              │
│                                                                 │
│  HSEmotion enet_b2_8 ONNX                                       │
│   └── 8 AffectNet emotions → percentages 0–100                 │
│                                                                 │
│  PDPA: Gaussian blur on face ROIs in thumbnail_b64             │
│  frame_b64 (unblurred) → Gemini only, never leaves backend     │
│                                                                 │
│  Tailscale WireGuard mesh ←→ Render backend                    │
│  RTSP cameras → direct LAN access (no internet hop)            │
└─────────────────────────────────────────────────────────────────┘

── Standalone companion monitor ──────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│  RydeGate Classroom Intelligence  (rydegate_classroom.py)  v3   │
│  Streamlit UI — runs on any local machine / classroom PC        │
│  VLCCapture (RTSP) · FrameBuffer (file/webcam/YouTube)         │
│  YOLOv11n-Pose · HSEmotion enet_b2_8 · YOLO-World              │
│  Fully local — no cloud API required                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### EduSphere Web Dashboard

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Charts | Recharts (AreaChart, LineChart, BarChart, PieChart) |
| State | React Context (AuthContext, ThemeContext, DemoContext) |
| Backend | Node.js, Express, TypeScript, Docker |
| AI — scene | Google Gemini 2.0 Flash |
| AI — faces | HSEmotion `enet_b2_8` ONNX + YOLOv11n-pose |
| Database | Supabase (PostgreSQL + RLS) |
| Realtime | Server-Sent Events (SSE) |
| Auth | API-key RBAC middleware |
| Networking | Tailscale WireGuard mesh (RTSP camera access) |
| Deployment | Netlify (frontend) · Render.com Docker (backend + sidecar) |

### RydeGate Classroom Intelligence

| Layer | Technology |
| ----- | ---------- |
| UI framework | Streamlit 1.35+ |
| Pose estimation | YOLOv11n-Pose (`yolo11n-pose.pt`) via Ultralytics |
| Object detection | YOLO-World (`yolov8s-worldv2.pt`) — open-vocabulary |
| Emotion engine | HSEmotion `enet_b2_8` (EfficientNet-B2, AffectNet-8, ONNX) |
| Sentiment model | Russell circumplex VA — valence×0.60 + gestural×0.40 |
| Motion detection | OpenCV MOG2 background subtractor |
| RTSP capture | VLC libvlc memory-callback rendering (`python-vlc`) |
| Runtime | Python 3.10+ · fully local · no cloud API |

---

## Project Structure

```text
EduSphere-Ai-/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx            # Guard Up layout, camera strip, demo wiring
│   │   │   ├── MockFeedPanel.tsx        # Animated classroom grid (demo mode)
│   │   │   ├── RoomCard.tsx             # Camera feed, bounding-box overlay, analysis
│   │   │   ├── LiveEmotionPanel.tsx     # 7-emotion bars, face chips, pedagogical note
│   │   │   ├── EmotionTimelineChart.tsx # Per-emotion line chart over session
│   │   │   ├── EngagementChart.tsx      # Engagement + attention area chart
│   │   │   ├── GestureBreakdown.tsx     # Gesture donut chart
│   │   │   ├── AlertLog.tsx             # Live alert feed + dismiss (real + demo)
│   │   │   ├── SessionPanel.tsx         # Session start/stop/export (real + demo)
│   │   │   ├── LoginModal.tsx           # RBAC login
│   │   │   └── OperatorMode.tsx         # Full-screen engagement display
│   │   ├── pages/
│   │   │   ├── AnalyticsPage.tsx        # 7-day trends, room summary, emotion breakdown
│   │   │   ├── ReportsPage.tsx          # Session list + timeline drill-down
│   │   │   └── AuditLogPage.tsx         # Audit trail (admin only)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx          # RBAC + open mode
│   │   │   ├── ThemeContext.tsx         # Night / Day toggle
│   │   │   └── DemoContext.tsx          # Real / Demo toggle + localStorage
│   │   ├── demo/
│   │   │   └── mockStream.ts            # 6-phase mock tick generator + useMockStream hook
│   │   ├── types.ts                     # Shared TypeScript interfaces
│   │   └── index.css                    # CSS variable theme system
│   └── package.json
│
├── backend/
│   ├── Dockerfile                       # Node + Tailscale — joins tailnet on startup
│   ├── tailscale-start.sh               # Starts tailscaled, runs tailscale up, then Node
│   ├── server.ts                        # Express app entry point
│   ├── supabase_service.ts              # Supabase client (service role)
│   ├── poll-manager.ts                  # RTSP polling scheduler
│   ├── middleware/
│   │   └── rbac.ts                      # requireRole() middleware
│   └── routes/
│       ├── analytics.ts                 # /analytics/* — trends, snapshots, timeline
│       ├── camera.ts                    # /camera/* — RTSP polling
│       ├── sessions.ts                  # /sessions/*
│       ├── alerts.ts                    # /alerts/*
│       ├── reports.ts                   # /reports/sessions
│       ├── vision.ts                    # /analyze/gemini
│       ├── stream.ts                    # SSE /stream/:roomId
│       ├── audit.ts                     # /audit-logs
│       └── auth.ts                      # /auth/verify
│
├── backend/supabase_schema.sql          # v1 — core tables
├── backend/supabase_schema_v2.sql       # v2 — audit_logs, consent_records, RLS
├── backend/supabase_schema_v3.sql       # v3 — emotion_breakdown JSONB, pedagogical_note TEXT
│
├── deepface-service/
│   ├── Dockerfile                       # python:3.12-slim-bookworm, non-root user, model pre-bake
│   ├── main.py                          # FastAPI sidecar v2 — YOLOv11n-pose + HSEmotion ONNX
│   └── requirements.txt                 # ultralytics, hsemotion-onnx, onnxruntime, fastapi
│
├── rydegate_classroom.py                # RydeGate standalone Streamlit app
├── rydegate_requirements.txt            # Python dependencies for RydeGate
└── render.yaml                          # Render services definition
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- A Supabase project
- A Google Gemini API key
- Tailscale account (for RTSP camera access)

### 1 — Database

Run the SQL files in order in the Supabase SQL editor:

```sql
-- 1. Core tables
-- backend/supabase_schema.sql

-- 2. Audit logs, consent records, RLS policies
-- backend/supabase_schema_v2.sql

-- 3. Emotion breakdown + pedagogical note columns (safe to re-run — uses IF NOT EXISTS)
-- backend/supabase_schema_v3.sql
```

### 2 — Vision Sidecar (local)

```bash
cd deepface-service
pip install -r requirements.txt

# Windows
$env:DEEPFACE_API_KEY="your-sidecar-key"
uvicorn main:app --host 0.0.0.0 --port 8000

# macOS / Linux
DEEPFACE_API_KEY=your-sidecar-key uvicorn main:app --host 0.0.0.0 --port 8000
```

Model weights download automatically on first run (`yolo11n-pose.pt` ~6 MB, `enet_b2_8` ONNX ~28 MB).

Verify: open `http://localhost:8000/health` — you should see `"pose": true, "emotion": true`.

### 3 — Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**`backend/.env`**

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
DEEPFACE_API_URL=http://localhost:8000
DEEPFACE_API_KEY=your-sidecar-key

# RBAC — omit all three to run in open/demo mode (auto-login)
ADMIN_KEY=your-admin-secret
OPERATOR_KEY=your-operator-secret
VIEWER_KEY=your-viewer-secret
```

### 4 — Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

**`frontend/.env.local`**

```env
VITE_API_URL=http://localhost:3000/api
```

### 5 — Open the app

Navigate to `http://localhost:5173`. Toggle **Real / Demo** in the top nav to switch between live camera mode and the simulated classroom.

---

## RBAC Roles

| Role | Login key | Capabilities |
| ---- | --------- | ------------ |
| **Administrator** | `ADMIN_KEY` | Full access — audit logs, room management, all analytics |
| **Operator** | `OPERATOR_KEY` | Start/stop sessions, manage RTSP cameras, view analytics |
| **Viewer** | `VIEWER_KEY` | Read-only — analytics, reports, live feed (no session control) |
| **Open mode** | *(no keys set)* | Full admin — for development and demos |

---

## Deployment

### Netlify (Frontend)

| Setting | Value |
| ------- | ----- |
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `frontend/dist` |
| Environment variable | `VITE_API_URL=https://your-backend.onrender.com/api` |

### Render (Backend — Docker)

| Setting | Value |
| ------- | ----- |
| Runtime | Docker (`backend/Dockerfile`) |
| Health check path | `/api/health` |

Required environment variables:

| Key | Description |
| --- | ----------- |
| `GEMINI_API_KEY` | Google Gemini API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (keep secret) |
| `DEEPFACE_API_URL` | Sidecar URL — Tailscale IP e.g. `http://100.x.x.x:8000` |
| `DEEPFACE_API_KEY` | Shared secret with sidecar |
| `TAILSCALE_AUTH_KEY` | Ephemeral + reusable auth key from Tailscale dashboard |
| `ADMIN_KEY` | RBAC admin password |
| `OPERATOR_KEY` | RBAC operator password |
| `VIEWER_KEY` | RBAC viewer password |

### Render (Vision Sidecar — Docker)

| Setting | Value |
| ------- | ----- |
| Runtime | Docker (`deepface-service/Dockerfile`) |
| Plan | Standard (needs ~900 MB RAM) |
| Health check path | `/health` |

| Key | Description |
| --- | ----------- |
| `DEEPFACE_API_KEY` | Same value as backend's `DEEPFACE_API_KEY` |

> **Note:** For RTSP camera access, run the sidecar **locally** on the university network and expose it via Tailscale instead of deploying to Render. See [Tailscale Networking](#tailscale-networking).

---

## Analysis Pipeline

Each analysis tick (every 15 seconds):

```text
1. Capture frame
   ├── Webcam/Upload → canvas.toDataURL → base64 JPEG
   └── RTSP         → sidecar cv2.VideoCapture (local LAN via Tailscale)

2. Parallel AI calls
   ├── POST /analyze/gemini   → Gemini 2.0 Flash
   │     Returns: headcount, lecturer_present, engagement_score,
   │              gestures, classroom_sentiment, alert, pedagogical_note
   └── POST /analyze/deepface → Python FastAPI sidecar
         YOLOv11n-pose → face crops → HSEmotion enet_b2_8
         Returns: faces[], persons[], emotion_breakdown (%), attention_rate,
                  dominant_class_emotion, thumbnail_b64 (PDPA-blurred),
                  frame_b64 (unblurred, backend-only)

3. Merge results → applyAnalysis()
   └── Updates live UI + bounding-box canvas overlay

4. Persist snapshot
   └── POST /analytics/snapshot  (webcam / upload)
       or  supabase.insert()      (RTSP — server-side in camera.ts)
       Saves: engagement_score, headcount, lecturer_present,
              classroom_sentiment, gestures, alert_level,
              attention_rate, dominant_emotion,
              emotion_breakdown JSONB, pedagogical_note TEXT

5. Broadcast (RTSP only)
   └── broadcastToRoom(roomId, 'analysis', payload) → SSE to browser
```

---

## Emotion Color Reference

| Emotion | Color | Hex |
| ------- | ----- | --- |
| Happy | Green | `#10b981` |
| Neutral | Blue | `#3b82f6` |
| Surprise | Purple | `#8b5cf6` |
| Sad | Amber | `#f59e0b` |
| Angry | Red | `#ef4444` |
| Fear | Pink | `#ec4899` |
| Disgust | Orange | `#f97316` |

---

## License

Private — all rights reserved. University deployment only.
