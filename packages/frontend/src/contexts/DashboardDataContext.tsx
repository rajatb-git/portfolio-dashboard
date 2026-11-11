import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import type { HoldingAggregate } from '@/api/dashboard';
import type { HoldingEarning, HoldingEarningResult } from '@/api/analytics';
import { notifyTriggeredAlerts } from '@/utils/priceAlertNotifications';
import type { IAccount } from '@/models/AccountsModel';
import type { IAlertStatus } from '@/models/AlertModel';

type DashboardDataContextValue = {
  isLoading: boolean;
  isEarningsLoading: boolean;
  dashboardData: Array<HoldingAggregate>;
  accounts: Array<IAccount>;
  earnings: Array<HoldingEarning>;
  earningsResults: Array<HoldingEarningResult>;
  alertStatuses: Array<IAlertStatus>;
  // When the holdings last loaded, and why the latest attempt failed (if it did)
  // — so the page can say it is showing stale numbers instead of looking live.
  lastUpdated: Date | null;
  connectionError: string | null;
  refresh: () => void;
  revalidate: () => void;
  loadAlerts: () => void;
};

const DashboardDataContext = React.createContext<DashboardDataContextValue | null>(null);

// One refresh hits five endpoints; when the backend is down they all fail the
// same way, so they share one toast rather than stacking five.
const REFRESH_TOAST = 'dashboard-refresh-error';

// Lives above the router so dashboard data survives navigation: returning to the
// page renders the last-known values instantly while a silent poll revalidates in
// the background, instead of remounting into an empty, full-skeleton load each time.
export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<Array<IAccount>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>([]);
  const [alertStatuses, setAlertStatuses] = React.useState<Array<IAlertStatus>>([]);
  const [earnings, setEarnings] = React.useState<Array<HoldingEarning>>([]);
  const [earningsResults, setEarningsResults] = React.useState<Array<HoldingEarningResult>>([]);
  const [isEarningsLoading, setIsEarningsLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  const loadAlerts = React.useCallback((silent = false) => {
    apis.alerts
      .getStatus()
      .then((data) => {
        setAlertStatuses(data ?? []);
        notifyTriggeredAlerts(data ?? []);
      })
      .catch((err) => {
        if (!silent) toast.error(err.message || 'Failed to load alert statuses', { toastId: REFRESH_TOAST });
      });
  }, []);

  // The backend answers right away and marks holdings whose first quote is
  // still being fetched; poll quickly until those arrive rather than leaving
  // them at cost basis for a full refresh interval.
  const pendingTimer = React.useRef<number | null>(null);
  const pendingPolls = React.useRef(0);
  const PENDING_POLL_MS = 3000;
  const MAX_PENDING_POLLS = 40;

  const fetchData = React.useCallback(
    (silent: boolean) => {
      if (!silent) setIsLoading(true);

      apis.dashboard
        .getDashboard()
        .then((response) => {
          setDashboardData(response);
          setLastUpdated(new Date());
          setConnectionError(null);
          if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
          pendingTimer.current = null;
          if (response.some((row) => row.pricePending) && pendingPolls.current < MAX_PENDING_POLLS) {
            pendingPolls.current += 1;
            pendingTimer.current = window.setTimeout(() => fetchDataRef.current(true), PENDING_POLL_MS);
          } else {
            pendingPolls.current = 0;
          }
        })
        .catch((err) => {
          setConnectionError(err.message || 'Failed to load holdings');
          // Stay quiet on background polls so a transient blip doesn't spam toasts;
          // the page shows a stale-data banner instead.
          if (!silent) toast.error(err.message, { toastId: REFRESH_TOAST });
        })
        .finally(() => {
          if (!silent) setIsLoading(false);
        });

      // Evaluate standalone price alerts in the background and notify on triggers.
      loadAlerts(silent);

      if (!silent) setIsEarningsLoading(true);
      apis.analytics
        .getEarningsCalendar()
        .then((response) => setEarnings(response ?? []))
        .catch((err) => {
          if (!silent) toast.error(err.message || 'Failed to load earnings calendar', { toastId: REFRESH_TOAST });
        })
        .finally(() => {
          if (!silent) setIsEarningsLoading(false);
        });

      apis.analytics
        .getEarningsResults()
        .then((response) => setEarningsResults(response ?? []))
        .catch((err) => {
          if (!silent) toast.error(err.message || 'Failed to load earnings results', { toastId: REFRESH_TOAST });
        });

      apis.accounts
        .getAll()
        .then((response) => setAccounts(response))
        .catch((err) => {
          if (!silent) toast.error(err.message, { toastId: REFRESH_TOAST });
        });
    },
    [loadAlerts]
  );

  const fetchDataRef = React.useRef(fetchData);
  fetchDataRef.current = fetchData;

  const refresh = React.useCallback(() => fetchData(false), [fetchData]);
  const isLoadingRef = React.useRef(isLoading);
  isLoadingRef.current = isLoading;
  const revalidate = React.useCallback(() => {
    if (!isLoadingRef.current) fetchData(true);
  }, [fetchData]);

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
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
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
      earningsResults,
      alertStatuses,
      lastUpdated,
      connectionError,
      refresh,
      revalidate,
      loadAlerts,
    }),
    [
      lastUpdated,
      connectionError,
      isLoading,
      isEarningsLoading,
      dashboardData,
      accounts,
      earnings,
      earningsResults,
      alertStatuses,
      refresh,
      revalidate,
      loadAlerts,
    ]
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = React.useContext(DashboardDataContext);
  if (!ctx) throw new Error('useDashboardData must be used within a DashboardDataProvider');
  return ctx;
}
