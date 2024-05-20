'use client';

import * as React from 'react';

import LoadingButton from '@mui/lab/LoadingButton';
import { Box } from '@mui/material';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { enqueueSnackbar } from 'notistack';

import apis from '@/api';
import DatabaseTable from '@/components/DatabaseTable/DBTable';
import { Iconify } from '@/components/Iconify';
import { IHoldings } from '@/models/HoldingsModel';
import { IUser } from '@/models/UserModel';

import Error from './error';

const columns = [
  {
    id: 'userId',
    label: 'User',
  },
  {
    id: 'name',
    label: 'Name',
  },
  {
    id: 'symbol',
    label: 'SYM',
  },
  {
    id: 'qty',
    label: 'Quantity',
    align: 'right',
  },
  {
    id: 'averagePrice',
    label: 'Average Price',
    align: 'right',
  },
  {
    id: 'targetPrice',
    label: 'Target Price',
    align: 'right',
  },
  {
    id: 'type',
    label: 'Type',
  },
  { id: 'actions', label: '' },
];

export default function DataPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [holdings, setHoldings] = React.useState<Array<IHoldings>>();
  const [users, setUsers] = React.useState<Array<IUser>>();

  const deleteRecord = async (recordId: string) => {
    const deleteResponse = await apis.holdings.deleteHoldingById(recordId);
    return deleteResponse;
  };

  const insertHoldingsData = async (newData: Array<IHoldings>) => {
    await apis.holdings.insertHoldings(newData);
  };

  const loadData = () => {
    setIsLoading(true);

    Promise.all([apis.holdings.getAllHoldings(), apis.user.getAllUsers()])
      .then((response) => {
        setHoldings(response[0]);
        setUsers(response[1]);
      })
      .catch((err) => {
        enqueueSnackbar({ message: err.message, variant: 'error' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <ErrorBoundary errorComponent={Error}>
      <Box sx={{ display: 'flex', direction: 'row', justifyContent: 'flex-end', mb: '8px' }}>
        <LoadingButton
          variant="contained"
          startIcon={<Iconify icon="mynaui:refresh" />}
          onClick={loadData}
          loading={isLoading}
          size="small"
          color="secondary"
        >
          Refresh
        </LoadingButton>
      </Box>

      <DatabaseTable
        rows={holdings || []}
        columns={columns}
        handleDelete={deleteRecord}
        insertHoldingsData={insertHoldingsData}
        usersData={users || []}
      />
    </ErrorBoundary>
  );
}
