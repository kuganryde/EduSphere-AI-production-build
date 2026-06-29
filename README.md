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

</div>

---

## Overview

EduSphere AI is a full-stack university classroom monitoring platform. It captures live video from onboard webcams, RTSP IP cameras, or uploaded recordings, runs dual AI analysis (Google Gemini 2.0 Flash + DeepFace MTCNN), and streams real-time engagement, emotion, and attention data back to educators — all within a Guard Up-style dashboard designed for institutional use.

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
```

---

## Tech Stack

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
