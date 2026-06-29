import { Router } from "express";
import { supabase } from "../supabase_service";
import { requireRole } from "../middleware/rbac";
import { logAudit } from "./audit";

const router = Router();

// GET /api/reports/sessions — paginated session list with summary stats
router.get("/sessions", requireRole("viewer"), async (req, res) => {
  const { page = "1", limit = "20", status, from, to } = req.query;
  const offset = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

  let query = supabase
    .from("sessions")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range(offset, offset + parseInt(limit as string, 10) - 1);

  if (status) query = query.eq("status", status);
  if (from)   query = query.gte("started_at", from as string);
  if (to)     query = query.lte("started_at", to as string);

  const { data: sessions, count, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  // Attach snapshot summary to each session
  const enriched = await Promise.all(
    (sessions ?? []).map(async (session) => {
      const { data: snaps } = await supabase
        .from("engagement_snapshots")
        .select("engagement_score, headcount, alert_level")
        .eq("session_id", session.id);

      const scores  = (snaps ?? []).map(s => s.engagement_score).filter(Boolean);
      const alerts  = (snaps ?? []).filter(s => s.alert_level && s.alert_level >= 2).length;
      const avgEng  = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const maxHead = Math.max(0, ...(snaps ?? []).map(s => s.headcount ?? 0));

      const startMs  = new Date(session.started_at).getTime();
      const endMs    = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
      const duration = Math.round((endMs - startMs) / 60000);

      return {
        ...session,
        avg_engagement:  avgEng,
        peak_headcount:  maxHead,
        snapshot_count:  snaps?.length ?? 0,
        alert_count:     alerts,
        duration_minutes: duration,
      };
    })
  );

  await logAudit({ action: "view_reports", resource: "sessions", role: (req as any).role, ip: req.ip });

  res.json({ sessions: enriched, total: count ?? 0, page: parseInt(page as string, 10), limit: parseInt(limit as string, 10) });
});

// GET /api/reports/sessions/:id — detailed single session report
router.get("/sessions/:id", requireRole("viewer"), async (req, res) => {
  const { id } = req.params;

  const [{ data: session, error: sErr }, { data: snaps, error: snapErr }, { data: alerts, error: alertErr }] =
    await Promise.all([
      supabase.from("sessions").select("*").eq("id", id).single(),
      supabase.from("engagement_snapshots").select("*").eq("session_id", id).order("timestamp", { ascending: true }),
      supabase.from("alerts").select("*").eq("session_id", id).order("created_at", { ascending: true }),
    ]);

  if (sErr) { res.status(sErr.code === "PGRST116" ? 404 : 500).json({ error: sErr.message }); return; }
  if (snapErr || alertErr) { res.status(500).json({ error: snapErr?.message ?? alertErr?.message }); return; }

  const scores = (snaps ?? []).map(s => s.engagement_score).filter(Boolean);
  const avg    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const peak   = scores.length ? Math.max(...scores) : 0;
  const low    = scores.length ? Math.min(...scores) : 0;

  // Gesture totals across session
  const gestureTotals: Record<string, number> = {};
  for (const s of snaps ?? []) {
    if (!s.gestures) continue;
    for (const [k, v] of Object.entries(s.gestures as Record<string, number>)) {
      gestureTotals[k] = (gestureTotals[k] ?? 0) + (v ?? 0);
    }
  }

  const sentimentDist: Record<string, number> = {};
  for (const s of snaps ?? []) {
    if (s.classroom_sentiment) sentimentDist[s.classroom_sentiment] = (sentimentDist[s.classroom_sentiment] ?? 0) + 1;
  }

  const startMs  = new Date(session.started_at).getTime();
  const endMs    = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const duration = Math.round((endMs - startMs) / 60000);

  await logAudit({ action: "view_session_report", resource: "session", resource_id: id, role: (req as any).role, ip: req.ip });

  res.json({
    session,
    duration_minutes: duration,
    avg_engagement: avg,
    peak_engagement: peak,
    low_engagement: low,
    snapshot_count: snaps?.length ?? 0,
    gesture_totals: gestureTotals,
    sentiment_distribution: sentimentDist,
    alert_count: alerts?.length ?? 0,
    alerts: alerts ?? [],
    timeline: (snaps ?? []).map(s => ({
      t: s.timestamp,
      e: s.engagement_score,
      h: s.headcount,
      a: s.attention_rate,
    })),
  });
});

export default router;
