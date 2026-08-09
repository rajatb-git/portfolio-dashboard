import * as React from 'react';
import apis from '@/api';

type DemoModeContextValue = {
  enabled: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
};

const DemoModeContext = React.createContext<DemoModeContextValue | null>(null);

// Lives above the router (like AuthContext) so the "Mock Data" badge in
// TopBar reflects the current mode on every page, not just Settings.
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    try {
      const status = await apis.settings.getDemoMode();
      setEnabled(status.enabled);
    } catch {
      setEnabled(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await apis.settings.getDemoMode();
        if (!cancelled) setEnabled(status.enabled);
      } catch {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = React.useMemo<DemoModeContextValue>(
    () => ({ enabled, loading, refresh, setEnabled }),
    [enabled, loading, refresh]
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = React.useContext(DemoModeContext);
  if (!ctx) throw new Error('useDemoMode must be used within a DemoModeProvider');
  return ctx;
}
