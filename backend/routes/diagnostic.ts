import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const router = Router();

router.get("/deepface", async (req, res) => {
  const deepfaceUrl = process.env.DEEPFACE_URL || "http://localhost:5000";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // Attempting to hit a health endpoint on DeepFace, fallback to basic fetch
    const response = await fetch(`${deepfaceUrl}/health`, { signal: controller.signal })
      .catch(() => fetch(deepfaceUrl, { signal: controller.signal }));
      
    clearTimeout(timeoutId);
    
    res.json({
      service: "deepface",
      status: response.ok ? "healthy" : "unhealthy",
      statusCode: response.status
    });
  } catch (error: any) {
    res.json({
      service: "deepface",
      status: "unreachable",
      error: error.message
    });
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
    // Run a tiny, fast prompt just to test connectivity
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Ping. Reply with exactly 'Pong'." }] }],
    });
    
    res.json({
      service: "gemini",
      status: "healthy",
      response: response.text
    });
  } catch (error: any) {
    res.json({
      service: "gemini",
      status: "error",
      error: error.message
    });
  }
});

router.get("/supabase", async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    res.json({ service: "supabase", status: "unconfigured", error: "Missing Supabase credentials" });
    return;
  }
  
  try {
    // Assuming supabase is configured via the JS client
    // Since we don't have the instance here, we can test via standard REST fetch to the root or a known table
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`
      }
    });
    
    res.json({
      service: "supabase",
      status: response.ok ? "healthy" : "unhealthy",
      statusCode: response.status
    });
  } catch (error: any) {
    res.json({
      service: "supabase",
      status: "unreachable",
      error: error.message
    });
  }
});

export default router;
