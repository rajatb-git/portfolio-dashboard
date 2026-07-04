import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import type { HoldingAggregate } from '@/api/dashboard';
import type { HoldingEarning } from '@/api/analytics';
import { notifyTriggeredAlerts } from '@/utils/priceAlertNotifications';
import type { IAccount } from '@/models/AccountsModel';
import type { IAlertStatus } from '@/models/AlertModel';

type DashboardDataContextValue = {
  isLoading: boolean;
  isEarningsLoading: boolean;
  dashboardData: Array<HoldingAggregate>;
  accounts: Array<IAccount>;
  earnings: Array<HoldingEarning>;
  alertStatuses: Array<IAlertStatus>;
  refresh: () => void;
  loadAlerts: () => void;
};

const DashboardDataContext = React.createContext<DashboardDataContextValue | null>(null);

// Lives above the router so dashboard data survives navigation: returning to the
// page renders the last-known values instantly while a silent poll revalidates in
// the background, instead of remounting into an empty, full-skeleton load each time.
export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<Array<IAccount>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>([]);
  const [alertStatuses, setAlertStatuses] = React.useState<Array<IAlertStatus>>([]);
  const [earnings, setEarnings] = React.useState<Array<HoldingEarning>>([]);
  const [isEarningsLoading, setIsEarningsLoading] = React.useState(true);

  const loadAlerts = React.useCallback(() => {
    apis.alerts
      .getStatus()
      .then((data) => {
        setAlertStatuses(data ?? []);
        notifyTriggeredAlerts(data ?? []);
      })
      .catch(() => {});
  }, []);

  const fetchData = React.useCallback(
    (silent: boolean) => {
      if (!silent) setIsLoading(true);

      apis.dashboard
        .getDashboard()
        .then((response) => {
          setDashboardData(response);
        })
        .catch((err) => {
          // Stay quiet on background polls so a transient blip doesn't spam toasts.
          if (!silent) toast.error(err.message);
        })
        .finally(() => {
          if (!silent) setIsLoading(false);
        });

      // Evaluate standalone price alerts in the background and notify on triggers.
      loadAlerts();

      if (!silent) setIsEarningsLoading(true);
      apis.analytics
        .getEarningsCalendar()
        .then((response) => setEarnings(response ?? []))
        .catch((err) => {
          if (!silent) toast.error(err.message || 'Failed to load earnings calendar');
        })
        .finally(() => {
          if (!silent) setIsEarningsLoading(false);
        });

      apis.accounts
        .getAll()
        .then((response) => setAccounts(response))
        .catch((err) => {
          if (!silent) toast.error(err.message);
        });
    },
    [loadAlerts]
  );

  const refresh = React.useCallback(() => fetchData(false), [fetchData]);

  React.useEffect(() => {
    fetchData(false);

    // Auto-refresh so values track the market without a manual reload. The backend
    // serves cached quotes instantly and revalidates in the background, so each poll
    // both renders the latest cached prices and nudges the cache forward.
    const REFRESH_MS = 30_000;
    const tick = () => {
      if (document.visibilityState === 'visible') fetchData(true);
    };
    const timer = window.setInterval(tick, REFRESH_MS);
    // Refresh immediately when returning to the tab after it was hidden.
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fetchData]);

  const value = React.useMemo<DashboardDataContextValue>(
    () => ({
      isLoading,
      isEarningsLoading,
      dashboardData,
      accounts,
      earnings,
      alertStatuses,
      refresh,
      loadAlerts,
    }),
    [isLoading, isEarningsLoading, dashboardData, accounts, earnings, alertStatuses, refresh, loadAlerts]
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = React.useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within a DashboardDataProvider');
  return ctx;
}
