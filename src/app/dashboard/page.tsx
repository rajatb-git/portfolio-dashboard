'use client';

import * as React from 'react';

import { Alert } from '@mui/material';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

import apis from '@/api';
import { HoldingAggregate } from '@/api/dashboard';
import DashboardTable from '@/components/DashboardTable/DashTable';
import { SNACKBAR_AUTOHIDE_DURATION } from '@/config';
import { IUser } from '@/models/UserModel';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [users, setUsers] = React.useState<Array<IUser>>([]);
  const [dashboardData, setDashboardData] = React.useState<Array<HoldingAggregate>>();
  const [error, setError] = React.useState('');

  const columns = [
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

    { id: 'userId', label: 'Owner' },
  ];

  const loadUsers = async () => {
    return apis.user
      .getAllUsers()
      .then((response) => {
        setUsers(response);
      })
      .catch((err) => {
        enqueueSnackbar({ message: err.message, variant: 'error' });
      });
  };

  const loadData = async () => {
    setIsLoading(true);
    await loadUsers();

    apis.dashboard
      .getDashboard()
      .then((response) => setDashboardData(response))
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
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

      {dashboardData && (
        <DashboardTable
          isLoading={isLoading}
          refreshData={loadData}
          rows={dashboardData}
          users={users}
          columns={columns}
        />
      )}

      <SnackbarProvider autoHideDuration={SNACKBAR_AUTOHIDE_DURATION} />
    </>
  );
}
