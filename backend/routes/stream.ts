import { Router } from "express";

const router = Router();

// Store active SSE connections
const clients = new Map<string, any[]>();

router.get("/:roomId", (req, res) => {
  const { roomId } = req.params;
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  // Initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`);
  
  // Add client to the room's list
  if (!clients.has(roomId)) {
    clients.set(roomId, []);
  }
  const roomClients = clients.get(roomId)!;
  roomClients.push(res);
  
  // Clean up on disconnect
  req.on("close", () => {
    const clientsForRoom = clients.get(roomId);
    if (clientsForRoom) {
      const index = clientsForRoom.indexOf(res);
      if (index !== -1) {
        clientsForRoom.splice(index, 1);
      }
      if (clientsForRoom.length === 0) {
        clients.delete(roomId);
      }
    }
  });
});

// Helper function to broadcast events to a specific room
// Export this if needed from other parts of the application
export const broadcastToRoom = (roomId: string, eventType: string, payload: any) => {
  const roomClients = clients.get(roomId);
  if (roomClients) {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
    roomClients.forEach(client => client.write(message));
  }
};

export default router;
