import * as React from 'react';
import apis from '@/api';

type LockStatus = { enabled: boolean; idleTimeoutMinutes: number };

type AuthContextValue = {
  status: LockStatus | null;
  token: string | null;
  expiresAt: number | null;
  loading: boolean;
  unlock: (code: string) => Promise<void>;
  lock: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

function readStoredToken(): { token: string | null; expiresAt: number | null } {
  const token = sessionStorage.getItem('auth_token');
  const expiresRaw = sessionStorage.getItem('auth_expires');
  const expiresAt = expiresRaw ? Number(expiresRaw) : null;
  if (!token || !expiresAt || expiresAt <= Date.now()) {
    return { token: null, expiresAt: null };
  }
  return { token, expiresAt };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = readStoredToken();
  const [status, setStatus] = React.useState<LockStatus | null>(null);
  const [token, setToken] = React.useState<string | null>(initial.token);
  const [expiresAt, setExpiresAt] = React.useState<number | null>(initial.expiresAt);
  const [loading, setLoading] = React.useState(true);

  const clearToken = React.useCallback(() => {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_expires');
    setToken(null);
    setExpiresAt(null);
  }, []);

  const refreshStatus = React.useCallback(async () => {
    try {
      const lock = await apis.settings.getLock();
      setStatus(lock);
    } catch {
      setStatus({ enabled: false, idleTimeoutMinutes: 15 });
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lock = await apis.settings.getLock();
        if (!cancelled) setStatus(lock);
      } catch {
        if (!cancelled) setStatus({ enabled: false, idleTimeoutMinutes: 15 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const handler = () => clearToken();
    window.addEventListener('auth:locked', handler);
    return () => window.removeEventListener('auth:locked', handler);
  }, [clearToken]);

  const unlock = React.useCallback(
    async (code: string) => {
      const result = await apis.auth.unlock(code);
      sessionStorage.setItem('auth_token', result.token);
      sessionStorage.setItem('auth_expires', String(result.expiresAt));
      setToken(result.token);
      setExpiresAt(result.expiresAt);
    },
    [],
  );

  const lock = React.useCallback(async () => {
    try {
      await apis.auth.lock();
    } finally {
      clearToken();
    }
  }, [clearToken]);

  const value = React.useMemo<AuthContextValue>(
    () => ({ status, token, expiresAt, loading, unlock, lock, refreshStatus }),
    [status, token, expiresAt, loading, unlock, lock, refreshStatus],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
