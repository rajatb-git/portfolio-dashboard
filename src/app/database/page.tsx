'use client';

import * as React from 'react';

import { Box, Button, MenuItem, Select, Typography } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { toast } from 'react-toastify';

import apis from '@/api';
import ImportDialog from '@/components/DatabaseTable/DBImportDialog';
import GenericGrid from '@/components/DataGrid';
import { Iconify } from '@/components/Iconify';
import { IHoldings } from '@/models/HoldingsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { IUser } from '@/models/UserModel';

import Error from './error';

const columns: { [collection: string]: Array<GridColDef> } = {
  holdings: [
    {
      field: 'userId',
      headerName: 'User',
      flex: 1,
      editable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      editable: true,
    },
    {
      field: 'symbol',
      headerName: 'SYM',
      flex: 1,
      editable: true,
    },
    {
      field: 'qty',
      headerName: 'Quantity',
      flex: 1,
      editable: true,
    },
    {
      field: 'averagePrice',
      headerName: 'Average Price',
      flex: 1,
      editable: true,
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 1,
      editable: true,
    },
  ],
  user: [
    {
      field: 'id',
      headerName: 'Id',
      flex: 1,
      editable: true,
    },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      editable: true,
    },
  ],
  transactions: [
    {
      field: 'userId',
      headerName: 'User',
      flex: 1,
      editable: true,
    },
    {
      field: 'symbol',
      headerName: 'SYM',
      flex: 1,
      editable: true,
    },
    {
      field: 'qty',
      headerName: 'Quantity',
      flex: 1,
      editable: true,
      align: 'right',
    },
    {
      field: 'action',
      headerName: 'Action',
      flex: 1,
      editable: true,
    },
    {
      field: 'price',
      headerName: 'Price',
      flex: 1,
      editable: true,
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 1,
      editable: true,
    },
  ],
};

export default function DataPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeCollection, setActiveCollection] = React.useState<'user' | 'transactions' | 'holdings'>('holdings');
  const [records, setRecords] = React.useState<Array<IUser | IHoldings | ITransaction>>([]);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [usersData, setUsersData] = React.useState<Array<IUser>>([]);

  const deleteRecord = async (recordId: string) => {
    return apis[activeCollection].deleteById(recordId);
  };

  const openImportDialog = async () => {
    await apis.user.getAll().then((response) => {
      setUsersData(response);
    });

    setImportDialogOpen(true);
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setUsersData([]);
  };

  const insertOrUpdateRecord = async (record: IUser | ITransaction | IHoldings) => {
    return apis[activeCollection].insertOrUpdateById(record as any);
  };

  const insertHoldingsData = async (newData: Array<IHoldings>): Promise<void> => {
    await apis.holdings
      .insertHoldings(newData)
      .then(() => {
        toast.success('Successfully imported holdings data!');
      })
      .catch((err) => {
        toast.error(err.message);
      });
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
        toast.error(err.message);
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
      <Box sx={{ display: 'flex', direction: 'row', justifyContent: 'flex-start', mb: 2, gap: '8px' }}>
        <Typography variant="h6" flexGrow={1}>
          Database
        </Typography>

        <Button color="primary" startIcon={<Iconify icon="mage:file-upload-fill" />} onClick={openImportDialog}>
          Import holdings data
        </Button>

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
      </Box>

      {!isLoading && (
        <GenericGrid
          initialRows={records}
          deleteRecord={deleteRecord}
          insertOrUpdateRecord={insertOrUpdateRecord}
          loadData={loadData}
          activeCollection={activeCollection}
          dynamicColumns={columns[activeCollection]}
          refreshPage={loadData}
        />
      )}

      <ImportDialog
        open={importDialogOpen}
        handleDialogClose={closeImportDialog}
        insertHoldingsData={insertHoldingsData}
        usersData={usersData}
        refreshPage={loadData}
      />
    </ErrorBoundary>
  );
}
