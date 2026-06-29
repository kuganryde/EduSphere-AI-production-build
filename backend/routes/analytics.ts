import { Router } from "express";
import { supabase } from "../supabase_service";
import { requireRole } from "../middleware/rbac";
import { toUuid } from "../utils";

const router = Router();

// GET /api/analytics/rooms/summary — current status of all rooms
router.get("/rooms/summary", requireRole("viewer"), async (req, res) => {
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, expected_capacity");

  if (roomsError) {
    res.status(500).json({ error: roomsError.message });
    return;
  }

  // For each room, get its latest snapshot and active session
  const summaries = await Promise.all(
    (rooms ?? []).map(async (room) => {
      const [{ data: snapshot }, { data: session }] = await Promise.all([
        supabase
          .from("engagement_snapshots")
          .select("engagement_score, headcount, classroom_sentiment, timestamp")
          .eq("room_id", room.id)
          .order("timestamp", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("sessions")
          .select("id, status")
          .eq("room_id", room.id)
          .eq("status", "active")
          .limit(1)
          .single(),
      ]);

      return {
        roomId: room.id,
        name: room.name,
        status: session ? "active" : "idle",
        engagement: snapshot?.engagement_score ?? 0,
        headcount: snapshot?.headcount ?? 0,
        capacity: room.expected_capacity,
        lastUpdate: snapshot?.timestamp ?? null,
      };
    })
  );

  res.json(summaries);
});

// GET /api/analytics/trends — engagement trends last 7 days
router.get("/trends", requireRole("viewer"), async (req, res) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("engagement_snapshots")
    .select("timestamp, engagement_score")
    .gte("timestamp", since)
    .order("timestamp", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Group by day and average
  const byDay: Record<string, number[]> = {};
  for (const row of data ?? []) {
    const day = row.timestamp.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(row.engagement_score);
  }

  const days = Object.entries(byDay).map(([date, scores]) => ({
    date,
    averageEngagement: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));

  res.json({ trend: days.length > 1 ? "available" : "insufficient_data", days });
});

// POST /api/analytics/snapshot — save a complete merged Gemini + DeepFace snapshot
// Used by the frontend webcam/upload path to persist full emotion data
router.post("/snapshot", requireRole("operator"), async (req, res) => {
  const {
    session_id, room_id, engagement_score, headcount, lecturer_present,
    classroom_sentiment, gestures, alert_level, alert_type,
    attention_rate, dominant_emotion, emotion_breakdown, pedagogical_note,
  } = req.body;

  if (!session_id || !room_id) {
    res.status(400).json({ error: "session_id and room_id required" });
    return;
  }

  const { data, error } = await supabase
    .from("engagement_snapshots")
    .insert({
      session_id: toUuid(session_id), room_id: toUuid(room_id),
      engagement_score, headcount, lecturer_present,
      classroom_sentiment, gestures, alert_level, attention_rate,
      dominant_emotion, emotion_breakdown, pedagogical_note, source: "webcam",
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  // Save alert if one was triggered
  if (alert_type) {
    const LEVEL: Record<string, number> = {
      high_distraction: 2, low_attendance: 2, lecturer_absent: 3,
    };
    const MSG: Record<string, string> = {
      high_distraction: "High distraction detected — class may need re-engagement",
      low_attendance:   "Low attendance — headcount below expected capacity",
      lecturer_absent:  "Lecturer not visible — supervision gap detected",
    };
    await supabase.from("alerts").insert({
      session_id: toUuid(session_id), room_id: toUuid(room_id),
      level: LEVEL[alert_type] ?? 1,
      message: MSG[alert_type] ?? alert_type,
      alert_type,
    });
  }

  res.json(data);
});

// GET /api/analytics/:sessionId/timeline — per-snapshot timeseries for charting
// IMPORTANT: this route must be declared BEFORE /:sessionId to avoid Express matching
// "/timeline" as a sessionId parameter
router.get("/:sessionId/timeline", requireRole("viewer"), async (req, res) => {
  const { data, error } = await supabase
    .from("engagement_snapshots")
    .select(
      "timestamp, engagement_score, headcount, attention_rate, classroom_sentiment, dominant_emotion, emotion_breakdown, alert_level"
    )
    .eq("session_id", req.params.sessionId)
    .order("timestamp", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

// GET /api/analytics/:sessionId — full analytics for a session
router.get("/:sessionId", requireRole("viewer"), async (req, res) => {
  const { sessionId } = req.params;

  const [{ data: session, error: sessionError }, { data: snapshots, error: snapshotsError }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).single(),
      supabase
        .from("engagement_snapshots")
        .select("*")
        .eq("session_id", sessionId)
        .order("timestamp", { ascending: true }),
    ]);

  if (sessionError) {
    res.status(sessionError.code === "PGRST116" ? 404 : 500).json({ error: sessionError.message });
    return;
  }

  if (snapshotsError) {
    res.status(500).json({ error: snapshotsError.message });
    return;
  }

  const scores = (snapshots ?? []).map((s) => s.engagement_score).filter(Boolean);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const peak = scores.length ? Math.max(...scores) : 0;
  const lowest = scores.length ? Math.min(...scores) : 0;

  const sentiments = (snapshots ?? []).map((s) => s.classroom_sentiment).filter(Boolean);
  const sentimentCounts: Record<string, number> = {};
  for (const s of sentiments) sentimentCounts[s] = (sentimentCounts[s] ?? 0) + 1;

  // Aggregate emotion_breakdown across all snapshots
  const emotionBreakdown: Record<string, number[]> = {};
  for (const s of snapshots ?? []) {
    if (s.emotion_breakdown && typeof s.emotion_breakdown === "object") {
      for (const [emotion, value] of Object.entries(
        s.emotion_breakdown as Record<string, number>
      )) {
        if (!emotionBreakdown[emotion]) emotionBreakdown[emotion] = [];
        emotionBreakdown[emotion].push(value as number);
      }
    }
  }
  const avgEmotionBreakdown = Object.fromEntries(
    Object.entries(emotionBreakdown).map(([e, vals]) => [
      e,
      Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    ])
  );

  const startedAt = session.started_at ? new Date(session.started_at) : new Date();
  const endedAt = session.ended_at ? new Date(session.ended_at) : new Date();
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);

  res.json({
    sessionId,
    session,
    startTime: session.started_at,
    durationMinutes,
    averageEngagement: avg,
    peakEngagement: peak,
    lowestEngagement: lowest,
    totalSnapshots: snapshots?.length ?? 0,
    emotionDistribution: sentimentCounts,
    avgEmotionBreakdown,
    snapshots,
  });
});

export default router;
