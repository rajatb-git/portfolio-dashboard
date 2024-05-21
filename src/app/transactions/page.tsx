'use client';

import * as React from 'react';

import LoadingButton from '@mui/lab/LoadingButton';
import { Box } from '@mui/material';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import TransactionsTable from '@/components/TransactionsTable/TransTable';
import { SNACKBAR_AUTOHIDE_DURATION } from '@/config';
import { ITransaction } from '@/models/TransactionsModel';

import Error from './error';

const columns = [
  { id: 'action', label: 'Action' },
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
    id: 'price',
    label: 'Price',
    align: 'right',
  },
  { id: 'createdAt', label: 'Created At' },
  { id: '', label: '' },
];

export default function TransactionsPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState<Array<ITransaction>>();

  const deleteRecord = async (recordId: string) => {
    setIsLoading(true);

    const deleteResponse = await apis.transactions.deleteTransaction(recordId);

    loadData();

    return deleteResponse;
  };

  const loadData = () => {
    setIsLoading(true);

    apis.transactions
      .getAllTransactions()
      .then((response) => {
        setTransactions(response);
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

      <TransactionsTable rows={transactions || []} columns={columns} handleDelete={deleteRecord} />

      <SnackbarProvider autoHideDuration={SNACKBAR_AUTOHIDE_DURATION} />
    </ErrorBoundary>
  );
}
