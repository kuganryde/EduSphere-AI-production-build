import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'admin' | 'operator' | 'viewer';

export interface AuthState {
  role: Role | null;
  permissions: string[];
  isAuthenticated: boolean;
  openMode: boolean;
}

interface AuthCtx extends AuthState {
  login: (key: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  can: (permission: string) => boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const STORAGE_KEY = 'edusphere_access_key';

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    role: null, permissions: [], isAuthenticated: false, openMode: false,
  });

  // On mount, try to restore from storage
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) verify(stored);
    else {
      // Check if server runs in open mode (no keys configured)
      verify('');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function verify(key: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${API_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        if (res.status === 401) { setAuth({ role: null, permissions: [], isAuthenticated: false, openMode: false }); }
        return { ok: false, error: 'Invalid access key' };
      }
      const data = await res.json();
      setAuth({ role: data.role, permissions: data.permissions ?? [], isAuthenticated: true, openMode: !!data.open_mode });
      if (key) sessionStorage.setItem(STORAGE_KEY, key);
      return { ok: true };
    } catch {
      // Backend unreachable — allow open mode for dev
      setAuth({ role: 'admin', permissions: ['view_dashboard', 'manage_sessions', 'view_analytics', 'view_reports', 'view_audit_logs', 'operator_mode'], isAuthenticated: true, openMode: true });
      return { ok: true };
    }
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setAuth({ role: null, permissions: [], isAuthenticated: false, openMode: false });
  }

  function can(permission: string): boolean {
    if (!auth.isAuthenticated) return false;
    if (auth.openMode) return true;
    return auth.permissions.includes(permission);
  }

  return (
    <AuthContext.Provider value={{ ...auth, login: verify, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Get the Authorization header value for API calls. */
export function getAuthHeader(): Record<string, string> {
  const key = sessionStorage.getItem(STORAGE_KEY);
  return key ? { Authorization: `Bearer ${key}` } : {};
}
