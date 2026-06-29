import { Request, Response, NextFunction } from "express";

export type Role = "admin" | "operator" | "viewer";

const ROLE_KEYS: Record<Role, string | undefined> = {
  admin:    process.env.ADMIN_KEY,
  operator: process.env.OPERATOR_KEY,
  viewer:   process.env.VIEWER_KEY,
};

// Hierarchy: admin > operator > viewer
const ROLE_RANK: Record<Role, number> = { admin: 3, operator: 2, viewer: 1 };

/**
 * Resolve the role for an incoming API key.
 * Returns null if no keys are configured (open-dev mode).
 */
export function resolveRole(key: string | undefined): Role | null {
  if (!key) return null;
  for (const [role, secret] of Object.entries(ROLE_KEYS)) {
    if (secret && key === secret) return role as Role;
  }
  return null;
}

/**
 * Express middleware: attach req.role and req.isAuthenticated.
 * If no ADMIN_KEY env var is set, the server runs in open mode (all roles pass).
 */
export function attachRole(req: Request, _res: Response, next: NextFunction) {
  const openMode = !ROLE_KEYS.admin && !ROLE_KEYS.operator && !ROLE_KEYS.viewer;
  if (openMode) {
    (req as any).role = "admin";  // dev convenience
    (req as any).isAuthenticated = true;
    return next();
  }

  const header = req.headers["authorization"] ?? "";
  const apiKey = header.startsWith("Bearer ") ? header.slice(7) : (header as string);
  const role = resolveRole(apiKey);
  (req as any).role  = role;
  (req as any).isAuthenticated = !!role;
  next();
}

/**
 * Require at least the given minimum role.
 * Usage: router.get('/secret', requireRole('admin'), handler)
 */
export function requireRole(minimum: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role: Role | null = (req as any).role;
    if (!role) {
      res.status(401).json({ error: "Authentication required", hint: "Include Authorization: Bearer <access-key>" });
      return;
    }
    if (ROLE_RANK[role] < ROLE_RANK[minimum]) {
      res.status(403).json({ error: `Requires ${minimum} role`, your_role: role });
      return;
    }
    next();
  };
}
