import { Router } from "express";

const router = Router();

router.get("/rooms/summary", (req, res) => {
  res.json([
    {
      roomId: "room-402-b",
      name: "Room 402-B / Main Stage",
      status: "active",
      engagement: 84,
      headcount: 32,
      capacity: 34,
      lastUpdate: new Date().toISOString()
    },
    {
      roomId: "lecture-hall-a",
      name: "Lecture Hall A / Secondary",
      status: "idle",
      engagement: 0,
      headcount: 0,
      capacity: 100,
      lastUpdate: new Date().toISOString()
    }
  ]);
});

router.get("/trends", (req, res) => {
  res.json({
    trend: "stable",
    days: [
      { date: "2023-10-20", averageEngagement: 78 },
      { date: "2023-10-21", averageEngagement: 82 },
      { date: "2023-10-22", averageEngagement: 80 },
      { date: "2023-10-23", averageEngagement: 85 },
      { date: "2023-10-24", averageEngagement: 88 },
      { date: "2023-10-25", averageEngagement: 84 },
      { date: "2023-10-26", averageEngagement: 86 }
    ]
  });
});

router.get("/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  res.json({
    sessionId,
    startTime: new Date(Date.now() - 45 * 60000).toISOString(),
    durationMinutes: 45,
    averageEngagement: 84,
    peakEngagement: 92,
    lowestEngagement: 65,
    totalAlerts: 2,
    emotionDistribution: {
      focused: 65,
      mixed: 25,
      distracted: 10
    }
  });
});

export default router;
