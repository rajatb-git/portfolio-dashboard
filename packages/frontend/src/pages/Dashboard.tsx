import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import type { HoldingAggregate } from '@/api/dashboard';
import type { HoldingEarning } from '@/api/analytics';
import AlertDialog, { type DraftAlert, EMPTY_DRAFT } from '@/components/Alerts/AlertDialog';
import DashboardTable from '@/components/DashboardTable/DashTable';
import UpcomingEarningsCard from '@/components/Dashboard/UpcomingEarningsCard';
import { notifyTriggeredAlerts } from '@/utils/priceAlertNotifications';
import WatchlistSection from '@/components/WatchlistSection';
import type { IAccount } from '@/models/AccountsModel';
import type { IAlertStatus } from '@/models/AlertModel';
import type { Column } from '@/types';

export default function Dashboard() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<Array<IAccount>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>([]);
  const [alertStatuses, setAlertStatuses] = React.useState<Array<IAlertStatus>>([]);
  const [earnings, setEarnings] = React.useState<Array<HoldingEarning>>([]);
  const [isEarningsLoading, setIsEarningsLoading] = React.useState(true);
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [alertDraft, setAlertDraft] = React.useState<DraftAlert>(EMPTY_DRAFT);

  const columns: Array<Column> = [
    {
      id: 'symbol',
      label: 'SYM',
    },
    {
      id: 'currentPrice',
      label: 'Current Price',
      align: 'right',
    },
    {
      id: 'percentChange',
      label: 'Change',
      align: 'right',
    },
    {
      id: 'totalGLPercent',
      label: 'Total G/L',
      align: 'right',
    },

    { id: 'marketValue', label: 'Market Value', align: 'right' },
    { id: 'costBasis', label: 'Cost Basis', align: 'right' },
    { id: 'accountPercent', label: '% of Account', align: 'right' },
    { id: 'accountId', label: 'Account' },
    { id: '', label: 'Recommendation' },
  ];

  const loadAlerts = React.useCallback(() => {
    apis.alerts
      .getStatus()
      .then((data) => {
        setAlertStatuses(data ?? []);
        notifyTriggeredAlerts(data ?? []);
      })
      .catch(() => {});
  }, []);

  const handleSetAlert = (symbol: string, type: 'stock' | 'crypto', currentPrice?: number) => {
    setAlertDraft({
      ...EMPTY_DRAFT,
      symbol,
      type,
      targetPrice: currentPrice != null ? String(currentPrice) : '',
    });
    setAlertDialogOpen(true);
  };

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

      setIsEarningsLoading(true);
      apis.analytics
        .getEarningsCalendar()
        .then((response) => setEarnings(response ?? []))
        .catch((err) => toast.error(err.message || 'Failed to load earnings calendar'))
        .finally(() => setIsEarningsLoading(false));

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

  return (
    <>
      <DashboardTable
        isLoading={isLoading}
        refreshData={refresh}
        rows={dashboardData}
        accounts={accounts}
        columns={columns}
        alertStatuses={alertStatuses}
        onSetAlert={handleSetAlert}
      />
      <UpcomingEarningsCard earnings={earnings} isLoading={isEarningsLoading} />
      <WatchlistSection />

      <AlertDialog
        open={alertDialogOpen}
        initial={alertDraft}
        onClose={() => setAlertDialogOpen(false)}
        onSaved={loadAlerts}
      />
    </>
  );
}
