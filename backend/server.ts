import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { attachRole } from "./middleware/rbac";
import { getConnectionCount } from "./routes/stream";

dotenv.config();

import healthRoutes    from "./routes/health";
import visionRoutes    from "./routes/vision";
import feedRoutes      from "./routes/feed";
import analyticsRoutes from "./routes/analytics";
import sessionsRoutes  from "./routes/sessions";
import cameraRoutes    from "./routes/camera";
import streamRoutes    from "./routes/stream";
import alertsRoutes    from "./routes/alerts";
import auditRoutes     from "./routes/audit";
import reportsRoutes   from "./routes/reports";
import diagnosticRoutes from "./routes/diagnostic";
import authRoutes      from "./routes/auth";
import studentsRoutes  from "./routes/students";

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security headers ────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for SSE in some browsers
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL ?? "*"],
    },
  },
}));

// ── CORS — allow Netlify frontend and configurable additional origins ────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_VERCEL,
  "https://edu-sphere-ai-production-build.vercel.app",
  "https://eduspherevision.netlify.app",
  "https://eduspheredetection.netlify.app",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Access-Role"],
  credentials: true,
}));

// ── Body parser — large limit for base64 image frames ──────────────────────────
app.use(express.json({ limit: "12mb" }));

// ── Global rate limit ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: "Too many requests, please slow down." },
  skip: (req) => req.path.startsWith("/api/stream"), // SSE connections exempt
}));

// ── Attach role to every request ────────────────────────────────────────────────
app.use(attachRole);

// ── Root / health ────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({
  status: "ok",
  service: "EduSphere AI Backend",
  sse_connections: getConnectionCount(),
}));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Routes ────────────────────────────────────────────────────────────────────────
app.use("/api/health",           healthRoutes);
app.use("/api/auth",             authRoutes);
app.use("/api/analyze/gemini",   visionRoutes);
app.use("/api/analyze/deepface", feedRoutes);
app.use("/api/analytics",        analyticsRoutes);
app.use("/api/sessions",         sessionsRoutes);
app.use("/api/camera",           cameraRoutes);
app.use("/api/stream",           streamRoutes);
app.use("/api/alerts",           alertsRoutes);
app.use("/api/audit",            auditRoutes);
app.use("/api/reports",          reportsRoutes);
app.use("/api/diagnostic",       diagnosticRoutes);
app.use("/api/students",         studentsRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error handler ─────────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ EduSphere backend running on port ${PORT}`);
  console.log(`   Gemini:     ${process.env.GEMINI_API_KEY    ? "✅ set" : "❌ missing"}`);
  console.log(`   Supabase:   ${process.env.SUPABASE_URL      ? "✅ set" : "❌ missing"}`);
  console.log(`   DeepFace:   ${process.env.DEEPFACE_API_URL  ? "✅ set" : "❌ missing"}`);
  console.log(`   Auth mode:  ${process.env.ADMIN_KEY         ? "🔒 RBAC enabled" : "⚠️  Open (no ADMIN_KEY set)"}`);
  console.log(`   PDPA blur:  enabled (deepface service)`);
});
