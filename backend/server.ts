import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

// Import routes
import healthRoutes from "./routes/health";
import visionRoutes from "./routes/vision";
import feedRoutes from "./routes/feed";
import analyticsRoutes from "./routes/analytics";
import sessionsRoutes from "./routes/sessions";
import cameraRoutes from "./routes/camera";
import streamRoutes from "./routes/stream";
import diagnosticRoutes from "./routes/diagnostic";
import alertsRoutes from "./routes/alerts";

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://eduspheredetection.netlify.app",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Body Parser ───────────────────────────────────────────────
app.use(express.json({ limit: "10mb" })); // base64 frames need higher limit

// ── Global Rate Limit ─────────────────────────────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please slow down." }
}));

// ── Routes ────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "ok", message: "EduSphere API Running" }));
app.get("/health", (req, res) => res.json({ status: "ok", message: "EduSphere API Running" }));

app.use("/api/health",            healthRoutes);
app.use("/api/analyze/gemini",    visionRoutes);
app.use("/api/analyze/deepface",  feedRoutes);
app.use("/api/analytics",         analyticsRoutes);
app.use("/api/sessions",          sessionsRoutes);
app.use("/api/camera",            cameraRoutes);
app.use("/api/stream",            streamRoutes);
app.use("/api/alerts",            alertsRoutes);
app.use("/api/diagnostic",        diagnosticRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Error Handler ─────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ EduSphere backend running on port ${PORT}`);
  console.log(`   Environment:  ${process.env.NODE_ENV || "development"}`);
  console.log(`   Gemini key:   ${process.env.GEMINI_API_KEY ? "✅ set" : "❌ missing"}`);
  console.log(`   Supabase:     ${process.env.SUPABASE_URL ? "✅ set" : "❌ missing"}`);
  console.log(`   DeepFace URL: ${process.env.DEEPFACE_API_URL ? "✅ set" : "❌ missing"}`);
});