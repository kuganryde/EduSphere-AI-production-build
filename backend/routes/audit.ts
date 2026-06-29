import { Router } from "express";
import { supabase } from "../supabase_service";
import { requireRole } from "../middleware/rbac";

const router = Router();

/**
 * Log an action. Call this from other routes, not from the client.
 */
export async function logAudit(params: {
  action: string;
  resource: string;
  resource_id?: string;
  role?: string;
  details?: object;
  ip?: string;
}) {
  await supabase.from("audit_logs").insert({
    action:      params.action,
    resource:    params.resource,
    resource_id: params.resource_id ?? null,
    user_role:   params.role ?? "unknown",
    details:     params.details ?? null,
    ip_address:  params.ip ?? null,
    created_at:  new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error("[audit] log error:", error.message);
  });
}

// GET /api/audit — admin only
router.get("/", requireRole("admin"), async (req, res) => {
  const { action, resource, from, to, limit = "100" } = req.query;

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(parseInt(limit as string, 10));

  if (action)   query = query.eq("action", action);
  if (resource) query = query.eq("resource", resource);
  if (from)     query = query.gte("created_at", from as string);
  if (to)       query = query.lte("created_at", to as string);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /api/audit/summary — admin only, aggregated action counts
router.get("/summary", requireRole("admin"), async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("action, user_role, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.action] = (counts[row.action] ?? 0) + 1;
  }
  res.json({ period_days: 30, total: data?.length ?? 0, by_action: counts });
});

// POST /api/audit/compact — admin only — archive snapshots > 90 days into daily summaries
router.post("/compact", requireRole("admin"), async (req, res) => {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch old snapshots
  const { data: old, error: fetchErr } = await supabase
    .from("engagement_snapshots")
    .select("session_id, timestamp, engagement_score, headcount")
    .lt("timestamp", cutoff);

  if (fetchErr) { res.status(500).json({ error: fetchErr.message }); return; }

  if (!old || old.length === 0) {
    res.json({ compacted: 0, message: "No snapshots older than 90 days" });
    return;
  }

  // Group by day + session
  const groups: Record<string, { scores: number[]; headcounts: number[] }> = {};
  for (const row of old) {
    const key = `${row.session_id}::${(row.timestamp as string).slice(0, 10)}`;
    if (!groups[key]) groups[key] = { scores: [], headcounts: [] };
    groups[key].scores.push(row.engagement_score);
    groups[key].headcounts.push(row.headcount);
  }

  // Insert compact summaries
  const summaries = Object.entries(groups).map(([key, g]) => {
    const [session_id, date] = key.split("::");
    const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    return {
      session_id,
      room_id: null,
      timestamp: `${date}T00:00:00Z`,
      engagement_score: avg(g.scores),
      headcount: avg(g.headcounts),
      source: "compact_summary",
      classroom_sentiment: "archived",
    };
  });

  const { error: insertErr } = await supabase.from("engagement_snapshots").insert(summaries);
  if (insertErr) { res.status(500).json({ error: insertErr.message }); return; }

  // Delete old individual snapshots
  const { error: delErr } = await supabase
    .from("engagement_snapshots")
    .delete()
    .lt("timestamp", cutoff)
    .neq("source", "compact_summary");

  if (delErr) { res.status(500).json({ error: delErr.message }); return; }

  await logAudit({ action: "compact_logs", resource: "engagement_snapshots", details: { compacted: old.length, summaries: summaries.length }, role: (req as any).role });

  res.json({ compacted: old.length, summaries_created: summaries.length, cutoff });
});

export default router;
