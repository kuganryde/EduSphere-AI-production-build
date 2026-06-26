import { Router } from "express";
import { supabase } from "../supabase_service";

const router = Router();

router.post("/register", async (req, res) => {
  const { name, location, expected_capacity, camera_url } = req.body;

  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({ name, location, expected_capacity, camera_url })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

router.get("/list", async (req, res) => {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(error.code === "PGRST116" ? 404 : 500).json({ error: error.message });
    return;
  }

  res.json({ success: true, removed: data });
});

export default router;
