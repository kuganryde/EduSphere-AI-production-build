<div align="center">

# EduSphere AI

## Real-time classroom intelligence platform for universities

Live emotion analytics · DeepFace detection · Gemini 2.0 Flash · RTSP / Webcam / Upload · Night & Day theme · RBAC · PDPA-compliant

---

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.35+-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Pose-00BFFF?logo=ultralytics&logoColor=white)](https://ultralytics.com)

</div>

---

## Overview

EduSphere AI is a full-stack university classroom monitoring platform. It captures live video from onboard webcams, RTSP IP cameras, or uploaded recordings, runs dual AI analysis (Google Gemini 2.0 Flash + DeepFace MTCNN), and streams real-time engagement, emotion, and attention data back to educators — all within a Guard Up-style dashboard designed for institutional use.

The platform ships two complementary monitors:

| Component | Technology | Purpose |
| --------- | ---------- | ------- |
| **EduSphere Web Dashboard** | React 18 + Node.js + Supabase | Full-stack session management, historical analytics, RBAC, PDPA |
| **RydeGate Classroom Intelligence** | Python + Streamlit + YOLOv8-Pose | Standalone local monitor — skeleton gesture detection, blended sentiment, non-blocking RTSP |

---

## Features

### Live Camera Sources

| Source | How it works |
| ------ | ------------ |
| **Onboard Webcam** | `getUserMedia` in-browser capture — frames sent directly to Gemini + DeepFace |
| **RTSP / IP Camera** | Server-side `cv2.VideoCapture` in the Python service; results streamed via SSE |
| **Video Upload** | Local recording played back in the browser; analyzed on the same 15 s interval |

### Guard Up-Style Dashboard

- **Camera strip at top** — one tile per source (Webcam, CCTV Cam 1, CCTV Cam 2, Upload, + Add RTSP). Click any tile to switch instantly. LIVE badge + glow ring on the active feed.
- **Stop Feed bar** — appears below the strip when a feed is active; one click to stop.
- **Main video panel** — bounding-box overlay: corner-bracket faces (emotion-colored), dashed blue person boxes.
- **Quick-stats sidebar** — Engagement %, Headcount / Capacity, Attention %, Lecturer Presence — updated every 15 s.
- **Session Panel** — start / stop recorded sessions with lecturer name, course code, capacity.

### Real-time Emotion Analytics

- **Live Emotion Panel** — 7-emotion horizontal progress bars (happy · neutral · surprise · sad · angry · fear · disgust) with per-face chips showing each face's emotion + attention status (✓ / ✗).
- **Gemini Pedagogical Note** — Gemini's actionable sentence for the educator displayed live (e.g. "Consider a short interactive quiz to re-engage the back rows").
- **Emotion Timeline Chart** — per-emotion line chart growing in real time over the session duration.
- **Engagement Chart** — dual-line area chart (Engagement % + DeepFace Attention %).
- **Gesture Breakdown** — donut chart: writing notes · looking at board · hands raised · using phone · heads down.
- **Alert Log** — level-coded (info / warning / critical) alerts for high distraction, low attendance, lecturer absence; real-time SSE push + dismiss.

### Analytics & Reports

- **7-day engagement trend** — AreaChart across all sessions
- **Room engagement snapshot** — BarChart per configured room
- **Per-session emotion breakdown** — horizontal BarChart showing average emotion distribution from DeepFace across the full session
- **Session reports** — timeline sparkline, gesture totals, sentiment distribution, alert count; JSON export

### Theme System

- **Night mode** (default) and **Day mode** toggle in the sidebar footer
- Full CSS custom-property theme: `--surface-0..4`, `--text-0..3`, `--border-0..2`, `--brand`, `--success/warning/danger` and their `-dim` variants
- Sidebar stays dark in both themes (institutional aesthetic)
- Persisted to `localStorage`

### Security & Compliance

- **RBAC** — `ADMIN_KEY`, `OPERATOR_KEY`, `VIEWER_KEY` env vars; open mode when no keys are set (auto-login for development / demos)
- **PDPA masking** — Gaussian blur applied to face ROIs in the Python service before thumbnails reach the browser
- **Audit log** — every session start/stop and role-sensitive action written to `audit_logs` table
- **Supabase RLS** — Row Level Security on all tables; backend uses the service-role key (bypasses RLS server-side only)

---

## RydeGate Classroom Intelligence (`rydegate_classroom.py`)

A standalone Python/Streamlit application that runs on any machine with a camera or RTSP connection. No cloud services required — all analysis runs locally.

### Non-blocking Video Pipeline

The core problem with vanilla `cv2.VideoCapture` in RTSP mode is that `VideoCapture()` and `cap.read()` can block for several seconds when the stream is slow or unstable, freezing the UI. `rydegate_classroom.py` fixes this with a **`FrameBuffer` class**:

```
FrameBuffer (daemon thread)
  └── _resolve_url()   ← URL/yt_dlp resolution runs here, never in main thread
  └── cap.grab()       ← non-blocking grab; retrieve() only when frame is needed
  └── queue.Queue(maxsize=2)  ← drop oldest frame, always keep newest
  └── exponential backoff reconnect (1 s → 10 s)

Main Streamlit loop
  └── buf.read_latest()   ← queue.get_nowait() — returns instantly or (False, None)
```

Status transitions are shown in a live banner: `connecting → streaming → reconnecting`.

### Skeleton Gesture Detection

Switched from `yolov8n.pt` (bounding boxes only) to `yolov8n-pose.pt` (bounding boxes + 17 COCO skeleton keypoints). The `classify_gesture()` function uses wrist / shoulder / hip Y-positions to classify each student in real time:

| Gesture | Detection Rule |
| ------- | -------------- |
| ✋ Raised Hand | Wrist Y < shoulder Y − 30% body height |
| 😔 Head Down | Nose Y > shoulder Y + 18% body height |
| ✍ Writing | Both wrists in desk zone (55–100% body height) |
| 📱 Phone | Single wrist at desk zone near body centreline |
| 👁 Looking Forward | None of the above |

### Blended Sentiment Score

Each student receives a combined sentiment score (0–100) mixing two independent signals:

```
sentiment = facial_score × 0.60 + gestural_score × 0.40

facial_score   = DeepFace emotion probabilities → (happy+surprise)×100 + neutral×50 / total
gestural_score = gesture valence (−1..+1) mapped to 10..90
                 raised_hand=+1.0, looking_forward=+0.7, writing=+0.8
                 phone=−0.6, head_down=−0.7
```

Classroom sentiment = average across all detected students → `Positive / Neutral / Negative`.

### Async Emotion Analysis

`EmotionWorker` runs DeepFace in a background daemon thread. The display loop calls `worker.submit()` (fire-and-forget, silently dropped if a job is already running) and reads results via `worker.latest()` with no blocking. This keeps FPS stable even when DeepFace takes 0.5–2 s per analysis.

### MOG2 Motion Detection

Replaced raw `cv2.absdiff` (sensitive to lighting changes and RTSP compression noise) with `cv2.BackgroundSubtractorMOG2` (`history=500`, `varThreshold=25`). MOG2 models the background over a rolling window so static objects and gradual illumination shifts don't create false motion signals.

### Quick Start

```bash
pip install -r rydegate_requirements.txt
streamlit run rydegate_classroom.py
```

`yolov8n-pose.pt` is downloaded automatically by ultralytics on first run (~6 MB).

### RydeGate Panels

| Panel | Location | Content |
| ----- | -------- | ------- |
| Live emotion bars | Sidebar | 7-emotion progress bars, session totals |
| Live gesture bars | Sidebar | 5-gesture breakdown, session totals |
| Sentiment gauge | Sidebar + bottom | Blended score + Positive/Neutral/Negative label |
| Pedagogical insight | Sidebar | Rule-based actionable note for the educator |
| Student chips | Bottom row | Per-student `S1 HAPPY ✓ ✋` — emotion, attention tick, gesture icon |
| Sentiment badge | Bounding box | Colour-coded percentage drawn directly on each student's box |
| Motion heatmap | Video overlay | Subtle red MOG2 foreground mask overlay when motion > 15% |
| Stream status | Top banner | `connecting / streaming / reconnecting` — never silent on failure |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 18 + Vite + Tailwind v4)                         │
│  Dashboard · AlertLog · LiveEmotionPanel · EmotionTimelineChart  │
│  EngagementChart · GestureBreakdown · SessionPanel · Reports     │
└───────────────┬───────────────────────────┬─────────────────────┘
                │  REST + SSE               │  getUserMedia (webcam)
                ▼                           │
┌──────────────────────────┐               │
│  Node.js / Express       │◄──────────────┘
│  backend (Render.com)    │
│                          │
│  /analyze/gemini  ──►  Gemini 2.0 Flash API
│  /analyze/deepface ──► Python FastAPI service
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
│  engagement_snapshots    │
│  alerts · audit_logs     │
│  consent_records         │
└──────────────────────────┘
           ▲
┌──────────┴───────────────┐
│  Python FastAPI          │
│  (Render.com)            │
│  DeepFace MTCNN          │
│  OpenCV HOG+SVM          │
│  PDPA blur on faces      │
│  /analyze/rtsp           │
│  /analyze (frame)        │
└──────────────────────────┘

── Standalone companion monitor ──────────────────────────────────

┌─────────────────────────────────────────────────────────────────┐
│  RydeGate Classroom Intelligence  (rydegate_classroom.py)        │
│  Streamlit UI — runs on any local machine / classroom PC         │
│                                                                  │
│  FrameBuffer (daemon thread)                                     │
│   └── queue-backed, auto-reconnect RTSP / YouTube / file         │
│                                                                  │
│  YOLOv8-Pose inference (every 3rd frame)                         │
│   └── bounding boxes + 17-keypoint skeleton                      │
│   └── classify_gesture() → raised_hand / head_down / writing /  │
│                             phone / looking_forward              │
│                                                                  │
│  EmotionWorker (async daemon thread)                             │
│   └── DeepFace on head-crop per student                          │
│   └── 7 emotions + attention heuristic + sentiment score         │
│                                                                  │
│  MOG2 background subtractor                                      │
│   └── per-frame motion score 0–100                               │
│                                                                  │
│  Blended sentiment = facial×0.6 + gestural×0.4                   │
│  Engagement = attention×0.6 + positive_emotion_rate×0.4          │
│  Pedagogical insight (rule-based, no API call)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### EduSphere Web Dashboard

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`) |
| Charts | Recharts (AreaChart, LineChart, BarChart, PieChart) |
| Backend | Node.js, Express, TypeScript |
| AI — scene | Google Gemini 2.0 Flash (`gemini-2.0-flash`) |
| AI — faces | DeepFace (`mtcnn==0.1.1`) + OpenCV HOG+SVM |
| Database | Supabase (PostgreSQL) |
| Realtime | Server-Sent Events (SSE) via `broadcastToRoom()` |
| Auth | API-key RBAC middleware (no OAuth required) |
| Deployment | Netlify (frontend) · Render.com (backend + Python) |

### RydeGate Classroom Intelligence

| Layer | Technology |
| ----- | ---------- |
| UI framework | Streamlit 1.35+ |
| Object detection | YOLOv8-Nano Pose (`yolov8n-pose.pt`) via Ultralytics |
| Emotion analysis | DeepFace (`opencv` backend, async daemon thread) |
| Motion detection | OpenCV MOG2 background subtractor |
| Video sources | RTSP · YouTube (yt-dlp) · local file |
| Stream capture | `FrameBuffer` — queue-backed, non-blocking, auto-reconnect |
| Gesture engine | COCO 17-keypoint skeleton rule classifier |
| Sentiment model | Facial × 0.6 + gestural valence × 0.4 |
| Runtime | Python 3.10+, fully local — no cloud API required |

---

## Project Structure

```
EduSphere-Ai-/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx            # Guard Up layout, camera strip, stats
│   │   │   ├── RoomCard.tsx             # Camera feed, bounding-box overlay, analysis
│   │   │   ├── LiveEmotionPanel.tsx     # 7-emotion bars, face chips, pedagogical note
│   │   │   ├── EmotionTimelineChart.tsx # Per-emotion line chart over session
│   │   │   ├── EngagementChart.tsx      # Engagement + attention area chart
│   │   │   ├── GestureBreakdown.tsx     # Gesture donut chart
│   │   │   ├── AlertLog.tsx             # Live alert feed + dismiss
│   │   │   ├── SessionPanel.tsx         # Session start/stop/export
│   │   │   ├── LoginModal.tsx           # RBAC login
│   │   │   └── OperatorMode.tsx         # Full-screen engagement display
│   │   ├── pages/
│   │   │   ├── AnalyticsPage.tsx        # 7-day trends, room summary, emotion breakdown
│   │   │   ├── ReportsPage.tsx          # Session list + timeline drill-down
│   │   │   └── AuditLogPage.tsx         # Audit trail (admin only)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx          # RBAC + open mode
│   │   │   └── ThemeContext.tsx         # Night / Day toggle
│   │   ├── types.ts                     # Shared TypeScript interfaces
│   │   └── index.css                    # CSS variable theme system
│   └── package.json
│
├── backend/
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
└── backend/supabase_schema_v3.sql       # v3 — emotion_breakdown, pedagogical_note
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- Python 3.10+ (for the DeepFace service)
- A Supabase project
- A Google Gemini API key

### 1 — Database

Run the SQL files in order in the Supabase SQL editor:

```sql
-- 1. Core tables
-- backend/supabase_schema.sql

-- 2. Audit logs, consent records, RLS policies
-- backend/supabase_schema_v2.sql

-- 3. Emotion breakdown columns
-- backend/supabase_schema_v3.sql
```

### 2 — Backend

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
DEEPFACE_API_KEY=your-deepface-key

# RBAC — omit all three to run in open/demo mode (auto-login)
ADMIN_KEY=your-admin-secret
OPERATOR_KEY=your-operator-secret
VIEWER_KEY=your-viewer-secret
```

### 3 — Python DeepFace Service

```bash
cd deepface-service
pip install fastapi uvicorn deepface mtcnn==0.1.1 opencv-python-headless
uvicorn main:app --port 8000
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

Navigate to `http://localhost:5173`. In open mode (no `*_KEY` env vars set on the backend), the app auto-logs in with admin access — no password required.

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

### Render.com (Backend)

| Setting | Value |
| ------- | ----- |
| Root directory | `backend` |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Environment variables | All vars from `.env` above |

### Render.com (Python Service)

| Setting | Value |
| ------- | ----- |
| Runtime | Python 3.10 |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

---

## Analysis Pipeline

Each analysis tick (every 15 seconds):

```
1. Capture frame
   ├── Webcam/Upload → canvas.toDataURL → base64 JPEG
   └── RTSP         → Python cv2.VideoCapture server-side

2. Parallel AI calls
   ├── POST /analyze/gemini  → Gemini 2.0 Flash
   │     Returns: headcount, lecturer_present, engagement_score,
   │              gestures, classroom_sentiment, alert, pedagogical_note
   └── POST /analyze/deepface → Python FastAPI + DeepFace MTCNN
         Returns: faces[], persons[], emotion_breakdown, attention_rate,
                  dominant_class_emotion, frame_width, frame_height

3. Merge results → applyAnalysis()
   └── Updates live UI + bounding-box canvas overlay

4. Persist snapshot
   └── POST /analytics/snapshot  (webcam / upload)
       or  supabase.insert()      (RTSP — server-side in camera.ts)
       Saves: engagement_score, headcount, lecturer_present,
              classroom_sentiment, gestures, alert_level,
              attention_rate, dominant_emotion,
              emotion_breakdown, pedagogical_note

5. Broadcast (RTSP only)
   └── broadcastToRoom(roomId, 'analysis', payload) → SSE to browser
```

---

## Emotion Color Reference

Used consistently across bounding boxes, charts, and live emotion bars:

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
