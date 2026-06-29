import { Router, Request, Response } from "express";

const router = Router();

// In-memory client registry — keyed by roomId
const clients = new Map<string, Set<Response>>();

// SSE heartbeat interval — keeps connections alive through proxies
const HEARTBEAT_MS = 30_000;

router.get("/:roomId", (req: Request, res: Response) => {
  const { roomId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable Nginx buffering
  res.flushHeaders();

  // Initial connection event
  res.write(`data: ${JSON.stringify({ type: "connected", roomId })}\n\n`);

  // Register client
  if (!clients.has(roomId)) clients.set(roomId, new Set());
  clients.get(roomId)!.add(res);

  // Heartbeat so the browser doesn't close the connection
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { cleanup(); }
  }, HEARTBEAT_MS);

  function cleanup() {
    clearInterval(heartbeat);
    const roomSet = clients.get(roomId);
    if (roomSet) {
      roomSet.delete(res);
      if (roomSet.size === 0) clients.delete(roomId);
    }
  }

  req.on("close", cleanup);
  req.on("error", cleanup);
  res.on("error", cleanup);
});

/**
 * Broadcast a typed SSE event to all clients watching a room.
 * Safely skips closed connections and cleans them up.
 */
export function broadcastToRoom(roomId: string, eventType: string, payload: unknown): void {
  const roomSet = clients.get(roomId);
  if (!roomSet || roomSet.size === 0) return;

  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  const dead: Response[] = [];

  for (const client of roomSet) {
    try {
      client.write(message);
    } catch {
      dead.push(client);
    }
  }

  for (const d of dead) {
    roomSet.delete(d);
  }
  if (roomSet.size === 0) clients.delete(roomId);
}

/** Returns the count of active SSE connections across all rooms. */
export function getConnectionCount(): number {
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}

export default router;
