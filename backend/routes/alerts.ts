import { Router } from "express";
import { supabase } from "../supabase_service";
import { requireRole } from "../middleware/rbac";

const router = Router();

// GET /api/alerts — viewer+ can see their room's alerts
router.get("/", requireRole("viewer"), async (req, res) => {
  const { room_id, session_id, limit = "50", dismissed } = req.query;

  let query = supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(parseInt(limit as string, 10));

  if (room_id)   query = query.eq("room_id", room_id);
  if (session_id) query = query.eq("session_id", session_id);
  if (dismissed === "false") query = query.is("dismissed_at", null);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PATCH /api/alerts/dismiss-all — must be BEFORE /:id route to avoid conflict
router.patch("/dismiss-all", requireRole("operator"), async (req, res) => {
  const { room_id, session_id } = req.body;
  if (!room_id && !session_id) {
    res.status(400).json({ error: "room_id or session_id required" });
    return;
  }

  let query = supabase
    .from("alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .is("dismissed_at", null);

  if (room_id)    query = query.eq("room_id", room_id);
  if (session_id) query = query.eq("session_id", session_id);

  const { error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// PATCH /api/alerts/:id/dismiss — operator+ required
router.patch("/:id/dismiss", requireRole("operator"), async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from("alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

export default router;
