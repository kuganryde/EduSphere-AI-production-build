import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";
import { supabase } from "../supabase_service";
import { broadcastToRoom } from "./stream";
import { toUuid } from "../utils";

const router = Router();

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: "Rate limit exceeded" },
});

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000;

const ALERT_LEVEL: Record<string, number> = {
  high_distraction: 2,
  low_attendance: 2,
  lecturer_absent: 3,
};

const ALERT_MESSAGE: Record<string, string> = {
  high_distraction: "High distraction detected — class may need re-engagement",
  low_attendance: "Low attendance — headcount below expected capacity",
  lecturer_absent: "Lecturer not visible — supervision gap detected",
};

router.post("/", limiter, async (req, res) => {
  const { image, roomId, room_id, session_id } = req.body;
  const effectiveRoomId = room_id ?? roomId;

  if (!image) {
    res.status(400).json({ error: "Missing image data" });
    return;
  }

  if (effectiveRoomId) {
    const cached = cache.get(effectiveRoomId);
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
            { inlineData: { data: base64Data, mimeType } },
            { text: "Analyze this classroom image." },
          ],
        },
      ],
      config: {
        systemInstruction:
          "You are a pedagogical analysis AI embedded in a university classroom monitor.\n" +
          "Analyze the provided classroom image and return ONLY valid JSON matching this schema exactly.\n" +
          "Do not include markdown, explanation, or any text outside the JSON object.\n" +
          "Schema:\n" +
          '{\n"headcount": number,\n"lecturer_present": boolean,\n"engagement_score": number 0-100,\n' +
          '"gestures": {\n"hands_raised": number,\n"writing_notes": number,\n"using_phone": number,\n"heads_down": number,\n"looking_at_board": number\n},\n' +
          '"classroom_sentiment": "focused" | "distracted" | "tired" | "energetic" | "mixed",\n' +
          '"alert": null | "high_distraction" | "low_attendance" | "lecturer_absent",\n' +
          '"pedagogical_note": "One actionable sentence for the educator.",\n' +
          '"confidence": number 0-100\n}',
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No text in Gemini response");

    const resultData = JSON.parse(resultText);

    if (effectiveRoomId) {
      cache.set(effectiveRoomId, { data: resultData, timestamp: Date.now() });
    }

    // Persist engagement snapshot
    if (session_id && effectiveRoomId) {
      supabase
        .from("engagement_snapshots")
        .insert({
          session_id: toUuid(session_id),
          room_id: toUuid(effectiveRoomId),
          engagement_score: resultData.engagement_score,
          headcount: resultData.headcount,
          lecturer_present: resultData.lecturer_present,
          classroom_sentiment: resultData.classroom_sentiment,
          gestures: resultData.gestures,
          alert_level: resultData.alert ? (ALERT_LEVEL[resultData.alert] ?? 1) : null,
          pedagogical_note: resultData.pedagogical_note ?? null,
          source: "gemini",
        })
        .then(({ error }) => {
          if (error) console.error("Snapshot save error:", error.message);
        });
    }

    // Persist alert to alerts table + broadcast via SSE
    if (resultData.alert && effectiveRoomId) {
      const alertPayload = {
        session_id: toUuid(session_id),
        room_id: toUuid(effectiveRoomId),
        level: ALERT_LEVEL[resultData.alert] ?? 1,
        message: ALERT_MESSAGE[resultData.alert] ?? resultData.alert,
        alert_type: resultData.alert,
      };

      supabase
        .from("alerts")
        .insert(alertPayload)
        .select()
        .single()
        .then(({ data: alertRow, error }) => {
          if (error) {
            console.error("Alert save error:", error.message);
            return;
          }
          // Broadcast to any SSE clients watching this room
          if (alertRow) {
            broadcastToRoom(effectiveRoomId, "alert", alertRow);
          }
        });
    }

    res.json(resultData);
  } catch (error: any) {
    console.error("Gemini Vision Error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
