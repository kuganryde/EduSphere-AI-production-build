import { Router } from "express";
import { resolveRole } from "../middleware/rbac";

const router = Router();

/**
 * POST /api/auth/verify — exchange an access key for its role.
 * Returns { role, permissions } so the frontend can build its navigation.
 */
router.post("/verify", (req, res) => {
  const { key } = req.body;
  if (!key) { res.status(400).json({ error: "key is required" }); return; }

  const openMode = !process.env.ADMIN_KEY && !process.env.OPERATOR_KEY && !process.env.VIEWER_KEY;
  if (openMode) {
    res.json({ role: "admin", permissions: allPermissions("admin"), open_mode: true });
    return;
  }

  const role = resolveRole(key);
  if (!role) { res.status(401).json({ error: "Invalid access key" }); return; }

  res.json({ role, permissions: allPermissions(role) });
});

/**
 * GET /api/auth/me — validate the key in the Authorization header.
 * Useful for the frontend to re-verify on page load.
 */
router.get("/me", (req, res) => {
  const openMode = !process.env.ADMIN_KEY;
  if (openMode) {
    res.json({ role: "admin", open_mode: true });
    return;
  }
  const role = (req as any).role;
  if (!role) { res.status(401).json({ error: "Not authenticated" }); return; }
  res.json({ role, permissions: allPermissions(role) });
});

function allPermissions(role: string) {
  const perms: Record<string, string[]> = {
    admin:    ["view_dashboard", "manage_sessions", "view_analytics", "view_reports", "view_audit_logs", "manage_rooms", "operator_mode"],
    operator: ["view_dashboard", "manage_sessions", "view_analytics", "operator_mode"],
    viewer:   ["view_dashboard", "view_analytics"],
  };
  return perms[role] ?? [];
}

export default router;
