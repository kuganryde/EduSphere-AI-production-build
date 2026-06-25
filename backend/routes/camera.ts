import { Router } from "express";

const router = Router();

const cameras: any[] = [
  { id: "cam-1", roomId: "room-402-b", name: "Main Stage Camera", type: "rtsp", url: "rtsp://...", active: true },
];

router.post("/register", (req, res) => {
  const { roomId, name, type, url } = req.body;
  const newCamera = {
    id: `cam-${Date.now()}`,
    roomId,
    name,
    type,
    url,
    active: true,
    registeredAt: new Date().toISOString()
  };
  cameras.push(newCamera);
  res.status(201).json(newCamera);
});

router.get("/list", (req, res) => {
  res.json(cameras);
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const index = cameras.findIndex(c => c.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: "Camera not found" });
    return;
  }
  
  const removed = cameras.splice(index, 1);
  res.json({ success: true, removed: removed[0] });
});

export default router;
