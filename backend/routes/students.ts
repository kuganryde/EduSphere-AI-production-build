import { Router } from "express";
import { supabase } from "../supabase_service";

const router = Router();

// List all registered students
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("students")
    .select("id, student_id, name, face_b64, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("students GET error:", error.message);
    // Return empty list rather than 500 so the page renders while table is being set up
    return res.json([]);
  }
  res.json(data ?? []);
});

// Register a student
router.post("/", async (req, res) => {
  const { student_id, name, face_b64 } = req.body;
  if (!student_id?.trim() || !name?.trim()) {
    return res.status(400).json({ error: "student_id and name are required" });
  }
  const { data, error } = await supabase
    .from("students")
    .insert({ student_id: student_id.trim(), name: name.trim(), face_b64: face_b64 ?? null })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Delete a student
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
