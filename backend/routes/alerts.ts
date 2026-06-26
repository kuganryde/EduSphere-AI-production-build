import { Router } from "express";
import { supabase } from "../supabase_service";

const router = Router();

// GET /api/alerts — fetch recent alerts for a room/session
router.get("/", async (req, res) => {
  const { room_id, session_id, limit = "50", dismissed } = req.query;

  let query = supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(parseInt(limit as string));

  if (room_id) query = query.eq("room_id", room_id);
  if (session_id) query = query.eq("session_id", session_id);
  if (dismissed === "false") query = query.is("dismissed_at", null);

  const { data, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PATCH /api/alerts/:id/dismiss — mark a single alert as dismissed
router.patch("/:id/dismiss", async (req, res) => {
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

// PATCH /api/alerts/dismiss-all — bulk dismiss for a room/session
router.patch("/dismiss-all", async (req, res) => {
  const { room_id, session_id } = req.body;
  if (!room_id && !session_id) {
    res.status(400).json({ error: "room_id or session_id required" });
    return;
  }

  let query = supabase
    .from("alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .is("dismissed_at", null);

  if (room_id) query = query.eq("room_id", room_id);
  if (session_id) query = query.eq("session_id", session_id);

  const { error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

export default router;
