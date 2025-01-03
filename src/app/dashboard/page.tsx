'use client';

import * as React from 'react';

import { Alert } from '@mui/material';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

import apis from '@/api';
import { HoldingAggregate } from '@/api/dashboard';
import DashboardTable from '@/components/DashboardTable/DashTable';
import { SNACKBAR_AUTOHIDE_DURATION } from '@/config';
import { IUser } from '@/models/UserModel';
import { Column } from '@/types';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [users, setUsers] = React.useState<Array<IUser>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>([]);
  const [error, setError] = React.useState('');

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
    { id: 'userId', label: 'Owner' },
    { id: '', label: 'Recommendation' },
  ];

  const loadData = async () => {
    setIsLoading(true);

    apis.dashboard
      .getDashboard()
      .then((response) => setDashboardData(response))
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });

    apis.user
      .getAll()
      .then((response) => {
        setUsers(response);
      })
      .catch((err) => {
        enqueueSnackbar({ message: err.message, variant: 'error' });
      });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      {error && (
        <Alert variant="filled" color="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      <DashboardTable
        isLoading={isLoading}
        refreshData={loadData}
        rows={dashboardData}
        users={users}
        columns={columns}
      />

      <SnackbarProvider autoHideDuration={SNACKBAR_AUTOHIDE_DURATION} />
    </>
  );
}
