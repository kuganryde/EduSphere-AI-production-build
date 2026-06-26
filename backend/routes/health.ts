import { Router } from "express";
import { supabase } from "../supabase_service";

const router = Router();

router.get("/", async (req, res) => {
  const geminiConfigured = !!process.env.GEMINI_API_KEY;
  const deepfaceConfigured = !!process.env.DEEPFACE_API_KEY;

  let supabaseStatus: "connected" | "error" = "error";
  try {
    const { error } = await supabase.from("rooms").select("id").limit(1);
    supabaseStatus = error ? "error" : "connected";
  } catch {
    supabaseStatus = "error";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      supabase: supabaseStatus,
      gemini: geminiConfigured ? "configured" : "missing",
      deepface: deepfaceConfigured ? "configured" : "missing",
    },
    version: "1.0.0",
  });
});

export default router;
