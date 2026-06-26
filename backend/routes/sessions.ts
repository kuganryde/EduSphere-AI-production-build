import { Router } from "express";
import { supabase } from "../supabase_service";

const router = Router();

router.post("/", async (req, res) => {
  const { room_id, lecturer_name, course_code, expected_capacity } = req.body;

  if (!lecturer_name || !course_code) {
    res.status(400).json({ error: "lecturer_name and course_code are required" });
    return;
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({ room_id, lecturer_name, course_code, expected_capacity, status: "active" })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

router.patch("/:id/end", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
    return;
  }

  res.json(data);
});

router.get("/", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from("sessions")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range(from, to);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
    return;
  }

  res.json(data);
});

export default router;
