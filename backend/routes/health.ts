import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  const geminiConfigured = !!process.env.GEMINI_API_KEY;
  const deepfaceConfigured = !!process.env.DEEPFACE_API_KEY;
  
  // We'll mock supabase connected for now, or check env vars
  const supabaseConnected = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY;

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseConnected ? "connected" : "error",
      gemini: geminiConfigured ? "configured" : "missing",
      deepface: deepfaceConfigured ? "configured" : "missing",
    },
    version: "1.0.0",
  });
});

export default router;
