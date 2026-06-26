import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: "Rate limit exceeded" }
});

// Cache map: roomId -> { data: any, timestamp: number }
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

router.post("/", limiter, async (req, res) => {
  const { image, roomId } = req.body;
  
  if (!image) {
    res.status(400).json({ error: "Missing image data" });
    return;
  }

  if (roomId) {
    const cached = cache.get(roomId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      res.json(cached.data);
      return;
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // The image should be base64. Let's extract the mime type and data if it's a data URL
    let base64Data = image;
    let mimeType = "image/jpeg";
    
    if (image.startsWith("data:")) {
      const parts = image.split(",");
      if (parts.length === 2) {
        const mimeMatch = parts[0].match(/data:(.*?);/);
        if (mimeMatch) mimeType = mimeMatch[1];
        base64Data = parts[1];
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType
              }
            },
            {
              text: "Analyze this image."
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a pedagogical analysis AI embedded in a university classroom monitor.\nAnalyze the provided classroom image and return ONLY valid JSON matching this schema exactly.\nDo not include markdown, explanation, or any text outside the JSON object.\nSchema:\n{\n\"headcount\": number (count of visible people),\n\"lecturer_present\": boolean,\n\"engagement_score\": number 0-100 (100 = fully engaged),\n\"gestures\": {\n\"hands_raised\": number,\n\"writing_notes\": number,\n\"using_phone\": number,\n\"heads_down\": number,\n\"looking_at_board\": number\n},\n\"classroom_sentiment\": \"focused\" | \"distracted\" | \"tired\" | \"energetic\" | \"mixed\",\n\"alert\": null | \"high_distraction\" | \"low_attendance\" | \"lecturer_absent\",\n\"pedagogical_note\": \"One actionable sentence for the educator.\",\n\"confidence\": number 0-100\n}",
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text in response");
    }

    const resultData = JSON.parse(resultText);

    if (roomId) {
      cache.set(roomId, { data: resultData, timestamp: Date.now() });
    }

    res.json(resultData);
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
