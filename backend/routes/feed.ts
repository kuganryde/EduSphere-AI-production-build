import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: "Rate limit exceeded" }
});

router.post("/", limiter, async (req, res) => {
  const { frame } = req.body;
  const deepfaceUrl = process.env.DEEPFACE_URL || "http://localhost:5000/analyze";
  const apiKey = process.env.DEEPFACE_API_KEY || "default_key";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

    const response = await fetch(deepfaceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({ frame }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DeepFace responded with status ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("DeepFace Error:", error);
    // Graceful degradation
    res.json({ degraded: true, message: "DeepFace service unavailable" });
  }
});

export default router;
