import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Import routes
import healthRoutes from "./backend/routes/health.js";
import visionRoutes from "./backend/routes/vision.js";
import feedRoutes from "./backend/routes/feed.js";
import analyticsRoutes from "./backend/routes/analytics.js";
import sessionsRoutes from "./backend/routes/sessions.js";
import cameraRoutes from "./backend/routes/camera.js";
import streamRoutes from "./backend/routes/stream.js";
import diagnosticRoutes from "./backend/routes/diagnostic.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(helmet({
    contentSecurityPolicy: false, // Vite needs inline scripts for HMR
  }));
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // API routes FIRST
  app.use("/api/health", healthRoutes);
  app.use("/api/analyze/gemini", visionRoutes);
  app.use("/api/analyze/deepface", feedRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/sessions", sessionsRoutes);
  app.use("/api/camera", cameraRoutes);
  app.use("/api/stream", streamRoutes);
  app.use("/api/diagnostic", diagnosticRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
