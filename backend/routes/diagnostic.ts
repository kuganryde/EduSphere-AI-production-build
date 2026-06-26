import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../supabase_service";

const router = Router();

router.get("/deepface", async (req, res) => {
  const deepfaceUrl = process.env.DEEPFACE_API_URL || "http://localhost:8000";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${deepfaceUrl}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    res.json({
      service: "deepface",
      status: response.ok ? "healthy" : "unhealthy",
      statusCode: response.status,
    });
  } catch (error: any) {
    res.json({ service: "deepface", status: "unreachable", error: error.message });
  }
});

router.get("/gemini", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({ service: "gemini", status: "unconfigured", error: "Missing API key" });
    return;
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: "Ping. Reply with exactly 'Pong'." }] }],
    });
    res.json({ service: "gemini", status: "healthy", response: response.text });
  } catch (error: any) {
    res.json({ service: "gemini", status: "error", error: error.message });
  }
});

router.get("/supabase", async (req, res) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.json({ service: "supabase", status: "unconfigured", error: "Missing Supabase credentials" });
    return;
  }
  try {
    const { error } = await supabase.from("rooms").select("id").limit(1);
    res.json({
      service: "supabase",
      status: error ? "unhealthy" : "healthy",
      error: error?.message,
    });
  } catch (error: any) {
    res.json({ service: "supabase", status: "unreachable", error: error.message });
  }
});

export default router;
