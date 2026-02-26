import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import { HoldingAggregate } from '@/api/dashboard';
import DashboardTable from '@/components/DashboardTable/DashTable';
import WatchlistSection from '@/components/WatchlistSection';
import { IAccount } from '@/models/AccountsModel';
import { Column } from '@/types';

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
      id: 'percentChange',
      label: 'Change',
      align: 'right',
    },
    {
      id: 'totalGLPercent',
      label: 'Total G/L',
      align: 'right',
    },
    {
      id: 'currentPrice',
      label: 'Current Price',
      align: 'right',
    },
    { id: 'marketValue', label: 'Market Value', align: 'right' },
    { id: 'accountId', label: 'Owner' },
    { id: '', label: 'Recommendation' },
    { id: '', label: '' },
  ];

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
      <WatchlistSection />
    </>
  );
}
