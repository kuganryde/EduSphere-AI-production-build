import { Router } from "express";

const router = Router();

// Mock database
const sessions: any[] = [];

router.post("/", (req, res) => {
  const { roomId, lecturerName, courseCode, capacity } = req.body;
  const newSession = {
    id: `session-${Date.now()}`,
    roomId,
    lecturerName,
    courseCode,
    capacity,
    startTime: new Date().toISOString(),
    status: "active"
  };
  sessions.push(newSession);
  res.status(201).json(newSession);
});

router.patch("/:id/end", (req, res) => {
  const { id } = req.params;
  const session = sessions.find(s => s.id === id);
  
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  
  session.status = "ended";
  session.endTime = new Date().toISOString();
  
  res.json(session);
});

router.get("/", (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  res.json({
    data: sessions.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total: sessions.length,
      totalPages: Math.ceil(sessions.length / limit)
    }
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;
  const session = sessions.find(s => s.id === id);
  
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  
  res.json(session);
});

export default router;
