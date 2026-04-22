import * as React from 'react';

import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow as MuiTableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { toast } from 'react-toastify';

import apis from '@/api';
import ImportDialog from '@/components/DataGrid/DBImportDialog';
import GenericGrid from '@/components/DataGrid';
import { Iconify } from '@/components/Iconify';
import { IHoldings } from '@/models/HoldingsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { IAccount } from '@/models/AccountsModel';

const columns: { [collection: string]: Array<GridColDef> } = {
  holdings: [
    {
      field: 'accountId',
      headerName: 'Account',
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
  accounts: [
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
      field: 'accountId',
      headerName: 'Account',
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

function AccountsManager({ accounts, isLoading, onRefresh }: { accounts: IAccount[]; isLoading: boolean; onRefresh: () => void }) {
  const [newName, setNewName] = React.useState('');
  const [adding, setAdding] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<IAccount | null>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await apis.accounts.create({ name } as IAccount);
      setNewName('');
      toast.success(`Account "${name}" created`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apis.accounts.deleteById(deleteTarget.id);
      toast.success(`Account "${deleteTarget.name}" deleted`);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <Card variant="outlined" sx={{ background: 'transparent' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5 }}>
          <TextField
            size="small"
            placeholder="New account name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            disabled={adding}
            sx={{ width: 280, '& input': { fontSize: '0.82rem' } }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<Iconify icon="mdi:plus" width={16} />}
            onClick={handleAdd}
            disabled={!newName.trim() || adding}
            sx={{ fontSize: '0.78rem', textTransform: 'none' }}
          >
            {adding ? 'Adding...' : 'Add Account'}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton onClick={onRefresh} size="small">
            <Iconify icon="fa:refresh" width={16} />
          </IconButton>
        </Stack>

        <Divider />

        <TableContainer sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <MuiTableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>ID</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem', width: 80 }}>Actions</TableCell>
              </MuiTableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <MuiTableRow key={i}>
                    <TableCell><Skeleton width="60%" /></TableCell>
                    <TableCell><Skeleton width="80%" /></TableCell>
                    <TableCell />
                  </MuiTableRow>
                ))
              ) : accounts.length === 0 ? (
                <MuiTableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled' }}>
                      No accounts yet. Add one above to get started.
                    </Typography>
                  </TableCell>
                </MuiTableRow>
              ) : (
                accounts.map((account) => (
                  <MuiTableRow key={account.id} hover>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{account.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{account.id}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete account">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(account)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                        >
                          <Iconify icon="mdi:delete-outline" width={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </MuiTableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will not remove
            any holdings associated with this account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function Database() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeCollection, setActiveCollection] = React.useState<'accounts' | 'transactions' | 'holdings'>('holdings');
  const [records, setRecords] = React.useState<Array<IAccount | IHoldings | ITransaction>>([]);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [accountsData, setAccountsData] = React.useState<Array<IAccount>>([]);

  const deleteRecord = async (recordId: string) => {
    return apis[activeCollection].deleteById(recordId);
  };

  const openImportDialog = async () => {
    await apis.accounts.getAll().then((response) => {
      setAccountsData(response);
    });

    setImportDialogOpen(true);
  };

  const closeImportDialog = () => {
    setImportDialogOpen(false);
    setAccountsData([]);
  };

  const insertOrUpdateRecord = async (record: IAccount | ITransaction | IHoldings) => {
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
    <>
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
          {['accounts', 'holdings', 'transactions'].map((x) => (
            <MenuItem key={x} value={x}>
              {x}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {activeCollection === 'accounts' ? (
        <AccountsManager
          accounts={records as IAccount[]}
          isLoading={isLoading}
          onRefresh={loadData}
        />
      ) : (
        !isLoading && (
          <GenericGrid
            initialRows={records}
            deleteRecord={deleteRecord}
            insertOrUpdateRecord={insertOrUpdateRecord}
            loadData={loadData}
            activeCollection={activeCollection}
            dynamicColumns={columns[activeCollection]}
            refreshPage={loadData}
          />
        )
      )}

      <ImportDialog
        open={importDialogOpen}
        handleDialogClose={closeImportDialog}
        insertHoldingsData={insertHoldingsData}
        accountsData={accountsData}
        refreshPage={loadData}
      />
    </>
  );
}
