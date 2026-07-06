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
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDropzone } from 'react-dropzone';
import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import type { IAccount } from '@/models/AccountsModel';
import type { IHoldings } from '@/models/HoldingsModel';
import type { ITransaction } from '@/models/TransactionsModel';
import { fnBytes } from '@/utils/formatNumber';

type Target = 'transactions' | 'holdings';

type Props = {
  open: boolean;
  target: Target;
  handleDialogClose: () => void;
  importTransactions: (rows: Partial<ITransaction>[]) => Promise<void>;
  insertHoldingsData: (rows: IHoldings[]) => Promise<void>;
  accountsData: IAccount[];
  refreshPage: () => void;
};

const PREVIEW_COLS: Record<Target, string[]> = {
  transactions: ['symbol', 'action', 'qty', 'price', 'type', 'date'],
  holdings: ['symbol', 'name', 'qty', 'averagePrice', 'type'],
};

async function extractPdfText(file: File): Promise<string> {
  // Loaded on demand so pdfjs (~1 MB) stays out of the main Database bundle.
  const pdfjsLib = await import('pdfjs-dist');
  const { default: pdfWorkerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n');
}

async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return extractPdfText(file);
  }
  return file.text();
}

export default function AiImportDialog({
  open,
  target,
  handleDialogClose,
  importTransactions,
  insertHoldingsData,
  accountsData,
  refreshPage,
}: Props) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [file, setFile] = React.useState<File | undefined>();
  const [pastedText, setPastedText] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [error, setError] = React.useState('');
  const [parsing, setParsing] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [rows, setRows] = React.useState<Array<Record<string, any>>>([]);
  const [skipped, setSkipped] = React.useState<string[]>([]);
  const [meta, setMeta] = React.useState<{ provider: string; model: string } | null>(null);

  const dropzoneBg = isLight ? theme.palette.grey[100] : theme.palette.grey[900];
  const dropzoneBorder = isLight ? theme.palette.grey[400] : theme.palette.grey[700];

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (accepted) => {
      setFile(accepted[0]);
      setRows([]);
      setSkipped([]);
    },
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'text/plain': ['.txt', '.text'],
      'text/tab-separated-values': ['.tsv'],
      'application/x-ofx': ['.ofx', '.qfx'],
    },
  });

  const reset = () => {
    setFile(undefined);
    setPastedText('');
    setAccountId('');
    setError('');
    setRows([]);
    setSkipped([]);
    setMeta(null);
    handleDialogClose();
  };

  const handleParse = async () => {
    setError('');
    setParsing(true);
    try {
      const text = file ? await extractText(file) : pastedText.trim();
      if (!text) {
        setError('Add a document or paste statement text first');
        return;
      }
      const result = await apis.live.parseImportDocument(target, text);
      setRows(result.rows);
      setSkipped(result.skipped);
      setMeta({ provider: result.provider, model: result.model });
      if (result.rows.length === 0) {
        setError('The AI found no recognizable rows in this document.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse document');
    } finally {
      setParsing(false);
    }
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    setError('');
    if (!accountId) {
      setError('Account is required');
      return;
    }
    if (rows.length === 0) return;
    setImporting(true);
    try {
      if (target === 'holdings') {
        await insertHoldingsData(rows.map((r) => ({ ...r, accountId })) as IHoldings[]);
      } else {
        await importTransactions(rows.map((r) => ({ ...r, accountId })));
      }
      refreshPage();
      reset();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const cols = PREVIEW_COLS[target];

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, m: 2, mb: 1 }}>
        <Iconify icon="mdi:robot-happy-outline" width={24} />
        <Typography variant="h6">AI Import {target === 'holdings' ? 'Holdings' : 'Transactions'}</Typography>
      </Stack>

      <Box sx={{ px: 2, pb: 2 }}>
        <Alert severity="info" icon={<Iconify icon="mdi:shield-lock-outline" />} sx={{ mb: 2 }}>
          Documents are parsed by your <strong>local Ollama</strong> model — nothing is sent to a hosted AI service.
          Requires the AI Agent provider set to <strong>Ollama (Local)</strong> in Settings.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

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
                    setRows([]);
                    setSkipped([]);
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
          <>
            <Box
              {...getRootProps()}
              sx={{
                border: `1px dashed ${dropzoneBorder}`,
                p: 2,
                bgcolor: dropzoneBg,
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                mb: 1.5,
              }}
            >
              <input {...getInputProps()} />
              <Iconify icon="fluent-color:document-folder-20" sx={{ height: 56, width: 56 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Drop a statement (PDF, CSV, TXT, OFX) or click to select
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                Any broker format — the AI figures out the columns
              </Typography>
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', textAlign: 'center', mb: 1 }}>
              — or paste statement text —
            </Typography>
            <TextField
              multiline
              minRows={3}
              maxRows={8}
              fullWidth
              size="small"
              placeholder="Paste rows copied from a brokerage statement…"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              sx={{ mb: 2 }}
            />
          </>
        )}

        <Stack direction="row" sx={{ gap: 1, mb: 2 }}>
          <FormControl fullWidth size="small" required>
            <InputLabel>Account</InputLabel>
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} label="Account">
              {accountsData.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={handleParse}
            disabled={parsing || (!file && !pastedText.trim())}
            startIcon={parsing ? undefined : <Iconify icon="mdi:auto-fix" />}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {parsing ? 'Parsing…' : 'Parse with AI'}
          </Button>
        </Stack>

        {meta && rows.length > 0 && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mb: 1 }}>
            Parsed by {meta.provider} ({meta.model}) — review before importing.
          </Typography>
        )}

        {rows.length > 0 && (
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
              {rows.length} row{rows.length === 1 ? '' : 's'} found
            </Typography>
            <Box sx={{ overflowX: 'auto', border: `1px solid ${dropzoneBorder}`, borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {cols.map((c) => (
                      <TableCell
                        key={c}
                        sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.disabled', py: 0.75 }}
                      >
                        {c}
                      </TableCell>
                    ))}
                    <TableCell sx={{ width: 40 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                      {cols.map((c) => (
                        <TableCell key={c} sx={{ fontSize: '0.75rem', py: 0.5 }}>
                          {String(row[c] ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell sx={{ py: 0.5 }}>
                        <IconButton size="small" onClick={() => removeRow(i)}>
                          <Iconify icon="mdi:delete-outline" width={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        {skipped.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            Skipped {skipped.length} row{skipped.length === 1 ? '' : 's'}: {skipped.slice(0, 5).join('; ')}
            {skipped.length > 5 ? '…' : ''}
          </Alert>
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
          disabled={rows.length === 0 || !accountId || importing}
          startIcon={importing ? undefined : <Iconify icon="line-md:upload" />}
        >
          {importing ? 'Importing…' : `Import ${rows.length || ''} row${rows.length === 1 ? '' : 's'}`}
        </Button>
      </Stack>
    </Dialog>
  );
}
