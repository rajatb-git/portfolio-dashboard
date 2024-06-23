'use client';

import * as React from 'react';

import LoadingButton from '@mui/lab/LoadingButton';
import { Box, MenuItem, Select, Typography } from '@mui/material';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

import apis from '@/api';
import DatabaseTable from '@/components/DatabaseTable/DBTable';
import { Iconify } from '@/components/Iconify';
import { SNACKBAR_AUTOHIDE_DURATION } from '@/config';
import { IHoldings } from '@/models/HoldingsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { IUser } from '@/models/UserModel';
import { Column } from '@/types';

import Error from './error';

const columns: { [collection: string]: Array<Column> } = {
  holdings: [
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
      id: 'type',
      label: 'Type',
    },
  ],
  user: [
    {
      id: 'id',
      label: 'Id',
    },
    {
      id: 'name',
      label: 'Name',
    },
  ],
  transactions: [
    {
      id: 'userId',
      label: 'User',
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
      id: 'action',
      label: 'Action',
    },
    {
      id: 'price',
      label: 'Price',
      align: 'right',
    },
    {
      id: 'type',
      label: 'Type',
    },
  ],
};

export default function DataPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeCollection, setActiveCollection] = React.useState<'user' | 'transactions' | 'holdings'>('transactions');
  const [records, setRecords] = React.useState<Array<IUser | IHoldings | ITransaction>>([]);

  const deleteRecord = async (recordId: string) => {
    const deleteResponse = await apis[activeCollection].deleteById(recordId);
    return deleteResponse;
  };

  const updateRecord = async (record: IUser | ITransaction | IHoldings) => {
    const updateResponse = await apis[activeCollection].updateById(record as any);
    return updateResponse;
  };

  const loadData = async () => {
    setRecords([]);
    setIsLoading(true);

    await apis[activeCollection]
      .getAll()
      .then((response) => {
        setRecords(response);
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
  }, [activeCollection]);

  return (
    <ErrorBoundary errorComponent={Error}>
      <Typography variant="h5">Database</Typography>

      <Box sx={{ display: 'flex', direction: 'row', justifyContent: 'flex-end', mb: '8px', gap: '8px' }}>
        <Select
          value={activeCollection}
          displayEmpty
          onChange={(e) => setActiveCollection(e.target.value as any)}
          size="small"
          disabled={isLoading}
        >
          {['user', 'holdings', 'transactions'].map((x) => (
            <MenuItem key={x} value={x}>
              {x}
            </MenuItem>
          ))}
        </Select>

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
        rows={records}
        columns={columns[activeCollection]}
        handleDelete={deleteRecord}
        handleUpdate={updateRecord}
        refreshData={loadData}
        isLoading={isLoading}
      />

      <SnackbarProvider autoHideDuration={SNACKBAR_AUTOHIDE_DURATION} />
    </ErrorBoundary>
  );
}
