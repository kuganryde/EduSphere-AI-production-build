/**
 * In-process RTSP polling manager.
 * Each room gets one setInterval that fires the supplied async callback.
 * State lives in-process (resets on redeploy) which is fine — the frontend
 * calls start-polling when it mounts the RTSP source.
 */

interface PollEntry {
  timer: ReturnType<typeof setInterval>;
  rtspUrl: string;
  startedAt: string;
}

const polls = new Map<string, PollEntry>();

export function startPolling(
  roomId: string,
  rtspUrl: string,
  intervalMs: number,
  callback: () => Promise<void>,
): void {
  stopPolling(roomId);                      // cancel any existing poll for this room
  callback();                               // immediate first run (don't wait for interval)
  const timer = setInterval(callback, intervalMs);
  polls.set(roomId, { timer, rtspUrl, startedAt: new Date().toISOString() });
}

export function stopPolling(roomId: string): boolean {
  const entry = polls.get(roomId);
  if (!entry) return false;
  clearInterval(entry.timer);
  polls.delete(roomId);
  return true;
}

export function getActivePollRooms(): Array<{ roomId: string; rtspUrl: string; startedAt: string }> {
  return [...polls.entries()].map(([roomId, e]) => ({
    roomId,
    rtspUrl: e.rtspUrl,
    startedAt: e.startedAt,
  }));
}

export function isPolling(roomId: string): boolean {
  return polls.has(roomId);
}
