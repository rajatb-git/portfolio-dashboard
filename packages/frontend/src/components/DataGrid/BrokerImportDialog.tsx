import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItem,
  ListItemIcon,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '@mui/material/styles';
import csvtojson from 'csvtojson';
import { Iconify } from '@/components/Iconify';
import type { IAccount } from '@/models/AccountsModel';
import type { ITransaction } from '@/models/TransactionsModel';
import { fnBytes } from '@/utils/formatNumber';

type Preset = 'generic' | 'robinhood' | 'schwab' | 'fidelity' | 'coinbase';

const PRESETS: { value: Preset; label: string; description: string }[] = [
  { value: 'generic', label: 'Generic CSV', description: 'Columns: symbol, qty, price, action, date, type' },
  {
    value: 'robinhood',
    label: 'Robinhood',
    description: 'Activity Date, Trans Code, Description, Quantity, Price, Amount',
  },
  {
    value: 'schwab',
    label: 'Charles Schwab',
    description: 'Date, Action, Symbol, Description, Quantity, Price, Amount',
  },
  { value: 'fidelity', label: 'Fidelity', description: 'Settlement Date, Action, Symbol, Quantity, Price' },
  {
    value: 'coinbase',
    label: 'Coinbase',
    description: 'Timestamp, Transaction Type, Asset, Quantity Transacted, Price at Transaction',
  },
];

type Props = {
  open: boolean;
  handleDialogClose: () => void;
  importTransactions: (rows: Partial<ITransaction>[]) => Promise<void>;
  accountsData: IAccount[];
  refreshPage: () => void;
};

function normalizeAction(raw: string): string {
  const s = (raw ?? '').toLowerCase().trim();
  if (s.includes('buy') || s === 'b' || s === 'bo') return 'buy';
  if (s.includes('sell') || s === 's' || s === 'so') return 'sell';
  if (s.includes('deposit') || s.includes('credit')) return 'deposit';
  if (s.includes('withdraw') || s.includes('debit')) return 'withdraw';
  return s;
}

function mapRow(row: Record<string, string>, preset: Preset, accountId: string): Partial<ITransaction> {
  switch (preset) {
    case 'robinhood': {
      const sym = (row['Description'] ?? '').split(' ')[0].split('-')[0].trim().toUpperCase();
      return {
        accountId,
        symbol: sym || undefined,
        action: normalizeAction(row['Trans Code'] ?? '') as any,
        qty: parseFloat(row['Quantity'] ?? '0') || 0,
        price: Math.abs(parseFloat(row['Price'] ?? '0')) || 0,
        date: row['Activity Date'],
        type: 'stock',
      };
    }
    case 'schwab': {
      return {
        accountId,
        symbol: (row['Symbol'] ?? '').trim().toUpperCase() || undefined,
        action: normalizeAction(row['Action'] ?? '') as any,
        qty: Math.abs(parseFloat(row['Quantity'] ?? '0')) || 0,
        price: Math.abs(parseFloat((row['Price'] ?? '').replace(/[$,]/g, ''))) || 0,
        date: row['Date'],
        type: 'stock',
      };
    }
    case 'fidelity': {
      return {
        accountId,
        symbol: (row['Symbol'] ?? '').trim().toUpperCase() || undefined,
        action: normalizeAction(row['Action'] ?? '') as any,
        qty: Math.abs(parseFloat((row['Quantity'] ?? '').replace(/,/g, ''))) || 0,
        price:
          Math.abs(parseFloat((row['Price ($)'] ?? row['Price'] ?? '').replace(/[$,]/g, ''))) || 0,
        date: row['Settlement Date'] ?? row['Date'],
        type: 'stock',
      };
    }
    case 'coinbase': {
      const txType = (row['Transaction Type'] ?? '').toLowerCase();
      let action = 'buy';
      if (txType === 'sell') action = 'sell';
      else if (txType === 'receive' || txType === 'rewards income') action = 'deposit';
      else if (txType === 'send') action = 'withdraw';
      return {
        accountId,
        symbol: (row['Asset'] ?? '').trim().toUpperCase() || undefined,
        action: action as any,
        qty: Math.abs(parseFloat(row['Quantity Transacted'] ?? '0')) || 0,
        price:
          Math.abs(parseFloat((row['Price at Transaction'] ?? '').replace(/[$,]/g, ''))) || 0,
        date: row['Timestamp'],
        type: 'crypto',
      };
    }
    default:
      return { ...row, accountId, type: (row.type ?? 'stock') as any };
  }
}

export default function BrokerImportDialog({
  open,
  handleDialogClose,
  accountsData,
  importTransactions,
  refreshPage,
}: Props) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [file, setFile] = React.useState<File | undefined>();
  const [preset, setPreset] = React.useState<Preset>('generic');
  const [accountId, setAccountId] = React.useState('');
  const [error, setError] = React.useState('');
  const [preview, setPreview] = React.useState<Partial<ITransaction>[]>([]);
  const [importing, setImporting] = React.useState(false);

  const dropzoneBg = isLight ? theme.palette.grey[100] : theme.palette.grey[900];
  const dropzoneBorder = isLight ? theme.palette.grey[400] : theme.palette.grey[700];

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (accepted) => setFile(accepted[0]),
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
  });

  const buildPreview = async (f: File, p: Preset, acc: string) => {
    if (!f) return;
    try {
      const content = await f.text();
      const parsed = await csvtojson({ trim: true }).fromString(content);
      const mapped = parsed.slice(0, 5).map((r: Record<string, string>) => mapRow(r, p, acc));
      setPreview(mapped);
    } catch {
      setPreview([]);
    }
  };

  React.useEffect(() => {
    if (file && accountId) buildPreview(file, preset, accountId);
  }, [file, preset, accountId]);

  const reset = () => {
    setFile(undefined);
    setPreset('generic');
    setAccountId('');
    setError('');
    setPreview([]);
    handleDialogClose();
  };

  const handleImport = async () => {
    setError('');
    if (!accountId) { setError('Account is required'); return; }
    if (!file) { setError('Please select a file'); return; }
    setImporting(true);
    try {
      const content = await file.text();
      const parsed = await csvtojson({ trim: true }).fromString(content);
      const rows = parsed.map((r: Record<string, string>) => mapRow(r, preset, accountId));
      await importTransactions(rows);
      refreshPage();
      reset();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const previewCols = ['symbol', 'action', 'qty', 'price', 'date', 'type'];

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
      <Typography sx={{ m: 2, mb: 1 }} variant="h6">
        Import Transactions from Broker
      </Typography>

      <Box sx={{ px: 2, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Broker Preset</InputLabel>
          <Select
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            label="Broker Preset"
          >
            {PRESETS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                <Box>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{p.label}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>{p.description}</Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {file ? (
          <Box
            sx={{
              border: `1px solid ${dropzoneBorder}`,
              p: 0.5,
              bgcolor: dropzoneBg,
              borderRadius: '8px',
              mb: 2,
            }}
          >
            <ListItem
              secondaryAction={
                <IconButton
                  onClick={() => {
                    setFile(undefined);
                    setPreview([]);
                  }}
                >
                  <Iconify icon="fa:close" />
                </IconButton>
              }
              sx={{ p: 0.5 }}
            >
              <ListItemIcon>
                <Iconify icon="tabler:file-filled" sx={{ height: 32, width: 32, ml: 1 }} />
              </ListItemIcon>
              <Box>
                <Typography variant="body2">{file.name}</Typography>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: 'text.disabled' }}>
                  {fnBytes(file.size)}
                </Typography>
              </Box>
            </ListItem>
          </Box>
        ) : (
          <Box
            {...getRootProps()}
            sx={{
              border: `1px dashed ${dropzoneBorder}`,
              p: 2,
              bgcolor: dropzoneBg,
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2,
            }}
          >
            <input {...getInputProps()} />
            <Iconify icon="fluent-color:document-folder-20" sx={{ height: 56, width: 56 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Drop CSV or click to select
            </Typography>
          </Box>
        )}

        <FormControl fullWidth size="small" required sx={{ mb: 2 }}>
          <InputLabel>Account</InputLabel>
          <Select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            label="Account"
          >
            {accountsData.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {preview.length > 0 && (
          <Box>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 1,
              }}
            >
              Preview (first {preview.length} rows)
            </Typography>
            <Box
              sx={{
                overflowX: 'auto',
                border: `1px solid ${dropzoneBorder}`,
                borderRadius: 1,
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {previewCols.map((c) => (
                      <TableCell
                        key={c}
                        sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.disabled', py: 0.75 }}
                      >
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                      {previewCols.map((c) => (
                        <TableCell key={c} sx={{ fontSize: '0.75rem', py: 0.5 }}>
                          {String((row as any)[c] ?? '—')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}
      </Box>

      <Divider />
      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, p: 2 }}>
        <Button color="error" onClick={reset}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!file || !accountId || importing}
          startIcon={importing ? undefined : <Iconify icon="line-md:upload" />}
        >
          {importing ? 'Importing...' : 'Import'}
        </Button>
      </Stack>
    </Dialog>
  );
}
