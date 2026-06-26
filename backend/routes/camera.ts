import { Router } from "express";
import { supabase } from "../supabase_service";
import { startPolling, stopPolling, getActivePollRooms, isPolling } from "../poll-manager";
import { broadcastToRoom } from "./stream";
import { GoogleGenAI } from "@google/genai";

const router = Router();

const DEEPFACE_API_URL = process.env.DEEPFACE_API_URL || "http://localhost:8000";
const DEEPFACE_API_KEY = process.env.DEEPFACE_API_KEY || "";
const POLL_INTERVAL_MS = 15_000;

const ALERT_LEVEL: Record<string, number> = {
  high_distraction: 2, low_attendance: 2, lecturer_absent: 3,
};
const ALERT_MESSAGE: Record<string, string> = {
  high_distraction: "High distraction detected — class may need re-engagement",
  low_attendance: "Low attendance — headcount below expected capacity",
  lecturer_absent: "Lecturer not visible — supervision gap detected",
};

// ── Shared: ask Gemini to analyse a base64 frame ──────────────────────────────
async function runGemini(frameB64: string): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { data: frameB64, mimeType: "image/jpeg" } },
          { text: "Analyze this classroom image." },
        ],
      }],
      config: {
        systemInstruction:
          "You are a pedagogical analysis AI embedded in a university classroom monitor.\n" +
          "Return ONLY valid JSON with no markdown.\n" +
          'Schema: {"headcount":number,"lecturer_present":boolean,"engagement_score":number 0-100,' +
          '"gestures":{"hands_raised":number,"writing_notes":number,"using_phone":number,"heads_down":number,"looking_at_board":number},' +
          '"classroom_sentiment":"focused"|"distracted"|"tired"|"energetic"|"mixed",' +
          '"alert":null|"high_distraction"|"low_attendance"|"lecturer_absent",' +
          '"pedagogical_note":"string","confidence":number 0-100}',
        responseMimeType: "application/json",
      },
    });
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// ── Core per-tick poll function ────────────────────────────────────────────────
async function pollRtspOnce(roomId: string, rtspUrl: string, sessionId: string | null) {
  const start = Date.now();

  let dfResult: any = null;
  try {
    const resp = await fetch(`${DEEPFACE_API_URL}/analyze/rtsp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": DEEPFACE_API_KEY },
      body: JSON.stringify({ rtsp_url: rtspUrl, session_id: sessionId ?? "none", room_id: roomId }),
      signal: AbortSignal.timeout(30_000),
    });
    if (resp.ok) dfResult = await resp.json();
  } catch (err: any) {
    console.error(`[RTSP poll] DeepFace fetch error for room ${roomId}: ${err.message}`);
  }

  if (!dfResult || dfResult.degraded) {
    broadcastToRoom(roomId, "poll_error", {
      room_id: roomId,
      error: dfResult?.error ?? "DeepFace unreachable",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Gemini analysis on the captured frame
  let geminiResult: any = null;
  if (dfResult.frame_b64) {
    geminiResult = await runGemini(dfResult.frame_b64);
  }

  const latencyMs = Date.now() - start;

  // Build combined payload (same shape frontend expects from SSE)
  const analysisEvent = {
    room_id: roomId,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    latency_ms: latencyMs,
    // Gemini fields
    engagement_score:     geminiResult?.engagement_score ?? 0,
    headcount:            geminiResult?.headcount ?? dfResult.face_count ?? 0,
    lecturer_present:     geminiResult?.lecturer_present ?? false,
    classroom_sentiment:  geminiResult?.classroom_sentiment ?? "unknown",
    gestures:             geminiResult?.gestures ?? null,
    alert:                geminiResult?.alert ?? null,
    pedagogical_note:     geminiResult?.pedagogical_note ?? null,
    // DeepFace fields
    aggregate:     dfResult.aggregate,
    faces:         dfResult.faces,
    persons:       dfResult.persons,
    frame_width:   dfResult.frame_width,
    frame_height:  dfResult.frame_height,
    // Small preview image for frontend
    thumbnail_b64: dfResult.thumbnail_b64 ?? null,
  };

  // Broadcast to SSE clients watching this room
  broadcastToRoom(roomId, "analysis", analysisEvent);

  // Persist snapshot
  if (sessionId) {
    supabase.from("engagement_snapshots").insert({
      session_id: sessionId,
      room_id: roomId,
      engagement_score: analysisEvent.engagement_score,
      headcount: analysisEvent.headcount,
      lecturer_present: analysisEvent.lecturer_present,
      classroom_sentiment: analysisEvent.classroom_sentiment,
      gestures: analysisEvent.gestures,
      alert_level: analysisEvent.alert ? (ALERT_LEVEL[analysisEvent.alert] ?? 1) : null,
      source: "rtsp",
    }).then(({ error }) => {
      if (error) console.error("[RTSP poll] snapshot save:", error.message);
    });
  }

  // Persist alert + re-broadcast alert event
  if (analysisEvent.alert && roomId) {
    supabase.from("alerts").insert({
      session_id: sessionId ?? null,
      room_id: roomId,
      level: ALERT_LEVEL[analysisEvent.alert] ?? 1,
      message: ALERT_MESSAGE[analysisEvent.alert] ?? analysisEvent.alert,
      alert_type: analysisEvent.alert,
    }).select().single().then(({ data, error }) => {
      if (error) console.error("[RTSP poll] alert save:", error.message);
      else if (data) broadcastToRoom(roomId, "alert", data);
    });
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// Register a room (existing)
router.post("/register", async (req, res) => {
  const { name, location, expected_capacity, camera_url } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const { data, error } = await supabase
    .from("rooms").insert({ name, location, expected_capacity, camera_url }).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// List rooms (existing)
router.get("/list", async (req, res) => {
  const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// Delete room (existing)
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("rooms").delete().eq("id", id).select().single();
  if (error) { res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message }); return; }
  res.json({ success: true, removed: data });
});

// ── NEW: Start server-side RTSP polling ───────────────────────────────────────
router.post("/start-polling", async (req, res) => {
  const { room_id, rtsp_url, session_id } = req.body;

  if (!room_id || !rtsp_url) {
    res.status(400).json({ error: "room_id and rtsp_url are required" });
    return;
  }

  startPolling(
    room_id,
    rtsp_url,
    POLL_INTERVAL_MS,
    () => pollRtspOnce(room_id, rtsp_url, session_id ?? null),
  );

  res.json({
    ok: true,
    room_id,
    interval_ms: POLL_INTERVAL_MS,
    message: "RTSP polling started — results will stream via SSE",
  });
});

// ── NEW: Stop server-side RTSP polling ────────────────────────────────────────
router.post("/stop-polling", async (req, res) => {
  const { room_id } = req.body;
  if (!room_id) { res.status(400).json({ error: "room_id is required" }); return; }

  const stopped = stopPolling(room_id);
  broadcastToRoom(room_id, "poll_stopped", { room_id, timestamp: new Date().toISOString() });
  res.json({ ok: true, was_active: stopped });
});

// ── NEW: List active polling rooms ────────────────────────────────────────────
router.get("/polling-status", (_req, res) => {
  res.json(getActivePollRooms());
});

export default router;
