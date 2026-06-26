import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: "Rate limit exceeded" }
});

router.post("/", limiter, async (req, res) => {
  const { image_b64, session_id, room_id } = req.body;

  const deepfaceUrl = process.env.DEEPFACE_API_URL || "http://localhost:8000";
  const apiKey = process.env.DEEPFACE_API_KEY || "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${deepfaceUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ image_b64, session_id, room_id }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DeepFace responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("DeepFace Error:", error);
    res.json({ degraded: true, message: "DeepFace service unavailable" });
  }
});

export default router;
