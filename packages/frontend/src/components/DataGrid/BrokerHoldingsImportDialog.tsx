import {
  Alert,
  Box,
  Button,
  Dialog,
  Divider,
  FormControl,
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
import { useTheme } from '@mui/material/styles';
import csvtojson from 'csvtojson';
import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Iconify } from '@/components/Iconify';
import type { IAccount } from '@/models/AccountsModel';
import type { IHoldings } from '@/models/HoldingsModel';
import { fnBytes } from '@/utils/formatNumber';

type Preset = 'generic' | 'robinhood' | 'schwab' | 'fidelity' | 'coinbase';

const PRESETS: { value: Preset; label: string; description: string; type: 'stock' | 'crypto' }[] = [
  { value: 'generic', label: 'Generic CSV', description: 'Columns: symbol, name, qty, averagePrice', type: 'stock' },
  { value: 'robinhood', label: 'Robinhood', description: 'Symbol, Name, Shares, Average Cost', type: 'stock' },
  {
    value: 'schwab',
    label: 'Charles Schwab',
    description: 'Symbol, Description, Quantity, Cost Basis / Cost Per Share',
    type: 'stock',
  },
  {
    value: 'fidelity',
    label: 'Fidelity',
    description: 'Symbol, Description, Quantity, Average Cost Basis',
    type: 'stock',
  },
  { value: 'coinbase', label: 'Coinbase', description: 'Asset, Quantity, Cost Basis', type: 'crypto' },
];

// Strip currency formatting ($, commas, spaces) and parse a number.
function num(raw: unknown): number {
  if (raw === undefined || raw === null) return 0;
  const parsed = parseFloat(String(raw).replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
  }
  return '';
}

function mapRow(row: Record<string, string>, preset: Preset, accountId: string, type: string): Partial<IHoldings> {
  switch (preset) {
    case 'robinhood': {
      const qty = num(pick(row, ['Shares', 'Quantity']));
      return {
        accountId,
        type: type as IHoldings['type'],
        symbol: pick(row, ['Symbol', 'Instrument']).trim().toUpperCase(),
        name: pick(row, ['Name', 'Description']),
        qty,
        averagePrice: num(pick(row, ['Average Cost', 'Average Cost Basis', 'Cost'])),
      };
    }
    case 'schwab': {
      const qty = num(pick(row, ['Quantity', 'Qty (Quantity)', 'Qty']));
      const perShare = num(pick(row, ['Cost/Share', 'Average Cost', 'Price Paid']));
      const costBasis = num(pick(row, ['Cost Basis', 'Cost Basis Total']));
      return {
        accountId,
        type: type as IHoldings['type'],
        symbol: pick(row, ['Symbol']).trim().toUpperCase(),
        name: pick(row, ['Description', 'Name']),
        qty,
        averagePrice: perShare || (qty ? costBasis / qty : 0),
      };
    }
    case 'fidelity': {
      const qty = num(pick(row, ['Quantity']));
      const perShare = num(pick(row, ['Average Cost Basis', 'Average Cost']));
      const costBasis = num(pick(row, ['Cost Basis Total', 'Cost Basis']));
      return {
        accountId,
        type: type as IHoldings['type'],
        symbol: pick(row, ['Symbol']).trim().toUpperCase(),
        name: pick(row, ['Description', 'Name']),
        qty,
        averagePrice: perShare || (qty ? costBasis / qty : 0),
      };
    }
    case 'coinbase': {
      const qty = num(pick(row, ['Quantity', 'Total Balance', 'Balance']));
      const costBasis = num(pick(row, ['Cost Basis', 'Cost basis', 'Total Cost']));
      return {
        accountId,
        type: type as IHoldings['type'],
        symbol: pick(row, ['Asset', 'Symbol', 'Currency']).trim().toUpperCase(),
        name: pick(row, ['Name', 'Asset']),
        qty,
        averagePrice: qty ? costBasis / qty : 0,
      };
    }
    default:
      return {
        ...row,
        accountId,
        type: type as IHoldings['type'],
        symbol: String(row.symbol ?? '')
          .trim()
          .toUpperCase(),
        qty: num(row.qty),
        averagePrice: num(row.averagePrice),
      };
  }
}

type Props = {
  open: boolean;
  handleDialogClose: () => void;
  insertHoldingsData: (rows: Array<IHoldings>) => void;
  accountsData: IAccount[];
  refreshPage: () => void;
};

export default function BrokerHoldingsImportDialog({
  open,
  handleDialogClose,
  accountsData,
  insertHoldingsData,
  refreshPage,
}: Props) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [file, setFile] = React.useState<File | undefined>();
  const [preset, setPreset] = React.useState<Preset>('generic');
  const [accountId, setAccountId] = React.useState('');
  const [type, setType] = React.useState<'stock' | 'crypto'>('stock');
  const [error, setError] = React.useState('');
  const [preview, setPreview] = React.useState<Partial<IHoldings>[]>([]);

  const dropzoneBg = isLight ? theme.palette.grey[100] : theme.palette.grey[900];
  const dropzoneBorder = isLight ? theme.palette.grey[400] : theme.palette.grey[700];

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (accepted) => setFile(accepted[0]),
    multiple: false,
    accept: { 'text/csv': ['.csv'] },
  });

  const handlePreset = (next: Preset) => {
    setPreset(next);
    const def = PRESETS.find((p) => p.value === next);
    if (def) setType(def.type);
  };

  const buildPreview = async (f: File, p: Preset, acc: string, t: string) => {
    try {
      const content = await f.text();
      const parsed = await csvtojson({ trim: true }).fromString(content);
      const mapped = parsed
        .map((r: Record<string, string>) => mapRow(r, p, acc, t))
        .filter((h) => h.symbol)
        .slice(0, 5);
      setPreview(mapped);
    } catch {
      setPreview([]);
    }
  };

  React.useEffect(() => {
    if (file && accountId) buildPreview(file, preset, accountId, type);
  }, [file, preset, accountId, type]);

  const reset = () => {
    setFile(undefined);
    setPreset('generic');
    setAccountId('');
    setType('stock');
    setError('');
    setPreview([]);
    handleDialogClose();
  };

  const handleImport = async () => {
    setError('');
    if (!accountId) {
      setError('Account is required');
      return;
    }
    if (!file) {
      setError('Please select a file');
      return;
    }
    try {
      const content = await file.text();
      const parsed = await csvtojson({ trim: true }).fromString(content);
      const rows = parsed
        .map((r: Record<string, string>) => mapRow(r, preset, accountId, type))
        .filter((h) => h.symbol && (h.qty ?? 0) !== 0);
      if (rows.length === 0) {
        setError('No valid positions found in this file for the selected broker');
        return;
      }
      insertHoldingsData(rows as IHoldings[]);
      refreshPage();
      reset();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    }
  };

  const previewCols: Array<keyof IHoldings> = ['symbol', 'name', 'qty', 'averagePrice'];

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
      <Typography sx={{ m: 2 }} variant="h6">
        Import holdings from broker
      </Typography>

      <Box sx={{ mx: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }} variant="filled">
            {error}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="broker-h-preset-label">Broker format</InputLabel>
            <Select
              labelId="broker-h-preset-label"
              label="Broker format"
              value={preset}
              onChange={(e) => handlePreset(e.target.value as Preset)}
            >
              {PRESETS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" required>
            <InputLabel id="broker-h-account-label">Account</InputLabel>
            <Select
              labelId="broker-h-account-label"
              label="Account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <MenuItem disabled value="">
                Select account
              </MenuItem>
              {accountsData.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="broker-h-type-label">Type</InputLabel>
            <Select
              labelId="broker-h-type-label"
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as 'stock' | 'crypto')}
            >
              <MenuItem value="stock">stock</MenuItem>
              <MenuItem value="crypto">crypto</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
          {PRESETS.find((p) => p.value === preset)?.description}
        </Typography>

        {file?.name ? (
          <Box sx={{ border: `1px solid ${dropzoneBorder}`, p: 0.5, backgroundColor: dropzoneBg, borderRadius: '8px' }}>
            <ListItem sx={{ p: 0.5 }}>
              <ListItemIcon>
                <Iconify icon="tabler:file-filled" sx={{ height: 28, width: 28, ml: 1 }} />
              </ListItemIcon>
              <Box>
                <Typography variant="body2">{file.name}</Typography>
                <Typography sx={{ fontSize: theme.typography.pxToRem(10), fontWeight: 600 }}>
                  {fnBytes(file.size)}
                </Typography>
              </Box>
            </ListItem>
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px dashed ${dropzoneBorder}`,
              p: 2,
              backgroundColor: dropzoneBg,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            {...(() => {
              const { ref, style, ...rest } = getRootProps() as any;
              return rest;
            })()}
          >
            <input
              {...(() => {
                const { style, ...inputProps } = getInputProps() as any;
                return inputProps;
              })()}
            />
            <Iconify icon="fluent-color:document-folder-20" sx={{ height: 56, width: 56 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Drop a positions CSV here or click to select
            </Typography>
          </Box>
        )}

        {preview.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Preview (first {preview.length} mapped row{preview.length > 1 ? 's' : ''})
            </Typography>
            <Table size="small" sx={{ mt: 0.5 }}>
              <TableHead>
                <TableRow>
                  {previewCols.map((c) => (
                    <TableCell key={c} sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                      {c}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((h, i) => (
                  <TableRow key={i}>
                    {previewCols.map((c) => (
                      <TableCell key={c} sx={{ fontSize: '0.74rem' }}>
                        {String(h[c] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </Box>

      <Box sx={{ m: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button color="error" onClick={reset}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          startIcon={<Iconify icon="line-md:upload" />}
          disabled={!file?.name || !accountId}
        >
          Import
        </Button>
      </Box>
    </Dialog>
  );
}
