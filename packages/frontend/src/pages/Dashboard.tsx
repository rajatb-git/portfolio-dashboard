import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import type { HoldingAggregate } from '@/api/dashboard';
import type { HoldingEarning } from '@/api/analytics';
import DashboardTable from '@/components/DashboardTable/DashTable';
import PriceAlertsCard from '@/components/Dashboard/PriceAlertsCard';
import UpcomingEarningsCard from '@/components/Dashboard/UpcomingEarningsCard';
import { notifyPriceAlerts } from '@/utils/priceAlertNotifications';
import WatchlistSection from '@/components/WatchlistSection';
import type { IAccount } from '@/models/AccountsModel';
import LocalStorageUtil from '@/utils/localStorage';
import type { Column } from '@/types';

export default function Dashboard() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<Array<IAccount>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>([]);
  const [earnings, setEarnings] = React.useState<Array<HoldingEarning>>([]);
  const [isEarningsLoading, setIsEarningsLoading] = React.useState(true);

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

  const threshold = Number(LocalStorageUtil.getItem<string>('alert_threshold') ?? '5') || 5;

  const loadData = async () => {
    setIsLoading(true);

    apis.dashboard
      .getDashboard()
      .then((response) => {
        setDashboardData(response);
        notifyPriceAlerts(response, threshold);
      })
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });

    setIsEarningsLoading(true);
    apis.analytics
      .getEarningsCalendar()
      .then((response) => setEarnings(response ?? []))
      .catch((err) => toast.error(err.message || 'Failed to load earnings calendar'))
      .finally(() => setIsEarningsLoading(false));

    apis.accounts
      .getAll()
      .then((response) => {
        setAccounts(response);
      })
      .catch((err) => {
        toast.error(err.message);
      });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <DashboardTable
        isLoading={isLoading}
        refreshData={loadData}
        rows={dashboardData}
        accounts={accounts}
        columns={columns}
      />
      <PriceAlertsCard holdings={dashboardData} threshold={threshold} />
      <UpcomingEarningsCard earnings={earnings} isLoading={isEarningsLoading} />
      <WatchlistSection />
    </>
  );
}
