import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import type { HoldingAggregate } from '@/api/dashboard';
import DashboardTable from '@/components/DashboardTable/DashTable';
import PriceAlertsCard from '@/components/Dashboard/PriceAlertsCard';
import WatchlistSection from '@/components/WatchlistSection';
import type { IAccount } from '@/models/AccountsModel';
import LocalStorageUtil from '@/utils/localStorage';
import type { Column } from '@/types';

export default function Dashboard() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [accounts, setAccounts] = React.useState<Array<IAccount>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>([]);

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
      .then((response) => setDashboardData(response))
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });

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
      <WatchlistSection />
    </>
  );
}
