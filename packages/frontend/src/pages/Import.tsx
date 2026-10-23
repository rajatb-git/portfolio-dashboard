import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Grid,
  LinearProgress,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { ImportKind, ImportOptions, ImportPlan, ImportRun, RawImportRow } from '@/api/import';
import { Iconify } from '@/components/Iconify';
import ImportReview from '@/components/Import/ImportReview';
import RowEditDialog from '@/components/Import/RowEditDialog';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import { ACCOUNT_TAX_TYPE_LABELS, type AccountTaxType, type IAccount } from '@/models/AccountsModel';
import { fnCurrency } from '@/utils/formatNumber';
import {
  accountValues,
  autoMap,
  type ColumnMapping,
  detectDateOrder,
  detectDecimalComma,
  FIELD_HELP,
  FIELD_LABELS,
  FIELDS_FOR,
  type ImportField,
  isPdf,
  looksBinary,
  looksTabular,
  type ParsedTable,
  parseTable,
  REQUIRED_FOR,
  readFileText,
  splitForAi,
  toImportRows,
} from '@/utils/importFile';

const STEPS = ['What', 'Account', 'File', 'Columns', 'Review', 'Done'];
const NEW_ACCOUNT = '__new__';
const PREVIEW_DEBOUNCE_MS = 350;

const KINDS: Array<{ kind: ImportKind; icon: string; title: string; body: string; examples: string }> = [
  {
    kind: 'positions',
    icon: 'tabler:briefcase',
    title: 'Current positions',
    body: 'What you hold today. If the file lists tax lots (a date acquired for each purchase), every lot is kept with its own date and cost.',
    examples: 'Fidelity / Schwab "Positions" export, an unrealized gain / lot details report, a portfolio PDF',
  },
  {
    kind: 'history',
    icon: 'tabler:arrows-exchange',
    title: 'Transaction history',
    body: 'Your buys, sells, deposits and withdrawals. It can build your positions and tax lots from scratch, or just be recorded for realized gains.',
    examples: 'Fidelity / Schwab / Robinhood / Vanguard / Coinbase activity or history export',
  },
];

type Source =
  | { method: 'table'; fileName: string; table: ParsedTable }
  | { method: 'ai'; fileName: string; rows: RawImportRow[]; model: string; skipped: string[] };

export default function Import() {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [kind, setKind] = React.useState<ImportKind | null>(null);

  const [accounts, setAccounts] = React.useState<IAccount[] | null>(null);
  const [counts, setCounts] = React.useState<Record<string, { positions: number; transactions: number }>>({});
  const [accountId, setAccountId] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [newTaxType, setNewTaxType] = React.useState<AccountTaxType>('taxable');
  const [creating, setCreating] = React.useState(false);

  const [options, setOptions] = React.useState<ImportOptions>({
    mode: 'add',
    historyMode: 'build',
    applyCash: false,
    dateOrder: 'MDY',
    defaultAssetType: 'stock',
    decimalComma: false,
    costFromMarket: false,
  });
  const [dateOrderDetected, setDateOrderDetected] = React.useState(false);

  const [source, setSource] = React.useState<Source | null>(null);
  const [pasted, setPasted] = React.useState('');
  const [reading, setReading] = React.useState(false);
  const readAbort = React.useRef<AbortController | null>(null);
  const [aiReading, setAiReading] = React.useState(false);
  const [aiProgress, setAiProgress] = React.useState<{ part: number; total: number; startedAt: number } | null>(null);
  const [now, setNow] = React.useState(Date.now());
  // Corrections typed into the review, by row index of the current source.
  const [edits, setEdits] = React.useState<Record<number, RawImportRow>>({});
  const [editing, setEditing] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!aiReading) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [aiReading]);
  const [readError, setReadError] = React.useState('');
  const [aiReady, setAiReady] = React.useState<boolean | null>(null);

  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [sourceAccount, setSourceAccount] = React.useState('');

  const [excluded, setExcluded] = React.useState<Set<number>>(new Set());
  const [plan, setPlan] = React.useState<ImportPlan | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [previewError, setPreviewError] = React.useState('');
  const [committing, setCommitting] = React.useState(false);
  const [confirmReplace, setConfirmReplace] = React.useState(false);
  const [result, setResult] = React.useState<ImportPlan | null>(null);
  const [runs, setRuns] = React.useState<ImportRun[]>([]);

  const loadAccounts = React.useCallback(async () => {
    try {
      const [list, holdings, transactions] = await Promise.all([
        apis.accounts.getAll(),
        apis.holdings.getAll(),
        apis.transactions.getAll(),
      ]);
      const next: Record<string, { positions: number; transactions: number }> = {};
      for (const a of list) next[a.id] = { positions: 0, transactions: 0 };
      for (const h of holdings) if (next[h.accountId]) next[h.accountId].positions++;
      for (const t of transactions) if (next[t.accountId]) next[t.accountId].transactions++;
      setAccounts(list);
      setCounts(next);
      return list;
    } catch (err: any) {
      toast.error(err.message || 'Failed to load accounts');
      setAccounts([]);
      return [];
    }
  }, []);

  const loadRuns = React.useCallback(() => {
    apis.import
      .getRuns()
      .then(setRuns)
      .catch((err) => toast.error(err.message || 'Failed to load past imports'));
  }, []);

  React.useEffect(() => {
    loadAccounts();
    loadRuns();
    apis.live
      .getAiConfig()
      .then((c) => setAiReady(c.enabled && c.provider === 'ollama'))
      .catch((err) => {
        setAiReady(false);
        toast.error(err.message || 'Failed to load AI settings');
      });
  }, [loadAccounts, loadRuns]);

  const accountName = (id: string) => accounts?.find((a) => a.id === id)?.name ?? id;
  const existing = counts[accountId] ?? { positions: 0, transactions: 0 };
  const hasExisting = existing.positions + existing.transactions > 0;

  // ------------------------------------------------------------- rows --

  const built = React.useMemo((): { rows: RawImportRow[]; lineNumbers: number[] } => {
    if (!source) return { rows: [], lineNumbers: [] };
    const base =
      source.method === 'ai'
        ? { rows: source.rows, lineNumbers: source.rows.map((_, i) => i + 1) }
        : (() => {
            const { rows, sourceRowNumbers } = toImportRows(source.table, mapping, sourceAccount || undefined);
            return { rows, lineNumbers: sourceRowNumbers };
          })();
    return { rows: base.rows.map((r, i) => edits[i] ?? r), lineNumbers: base.lineNumbers };
  }, [source, mapping, sourceAccount, edits]);

  const request = React.useMemo(
    () =>
      kind && accountId && accountId !== NEW_ACCOUNT
        ? {
            accountId,
            kind,
            rows: built.rows,
            options,
            excluded: [...excluded],
            fileName: source?.fileName,
          }
        : null,
    [kind, accountId, built.rows, options, excluded, source]
  );

  // The review re-plans on every change so the summary always matches the
  // rows, settings and ticks on screen.
  React.useEffect(() => {
    if (step !== 4 || !request || !request.rows.length) return;
    let cancelled = false;
    setPreviewing(true);
    const timer = window.setTimeout(() => {
      apis.import
        .preview(request)
        .then((p) => {
          if (cancelled) return;
          setPlan(p);
          setPreviewError('');
        })
        .catch((err) => {
          if (cancelled) return;
          setPlan(null);
          setPreviewError(err.message || 'Failed to check the import');
          toast.error(err.message || 'Failed to check the import', { toastId: 'import-preview' });
        })
        .finally(() => !cancelled && setPreviewing(false));
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [step, request]);

  // ------------------------------------------------------------ steps --

  const chooseKind = (next: ImportKind) => {
    setKind(next);
    setSource(null);
    setPlan(null);
    setExcluded(new Set());
    setStep(1);
  };

  const createAccount = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await apis.accounts.create({ name, cashBalance: 0, taxType: newTaxType } as IAccount);
      toast.success(`Account "${created.name}" created`);
      await loadAccounts();
      setAccountId(created.id);
      setNewName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const applyTable = (fileName: string, table: ParsedTable) => {
    if (!kind) return;
    const auto = autoMap(table.headers, kind);
    setMapping(auto);
    setSourceAccount('');
    const dateIndex = auto.date;
    const order = dateIndex !== undefined ? detectDateOrder(table.rows.map((r) => r[dateIndex])) : null;
    setDateOrderDetected(!!order);
    const symbolHeader = auto.symbol !== undefined ? table.headers[auto.symbol].toLowerCase() : '';
    const numberColumns = (['qty', 'price', 'costBasis', 'amount'] as const)
      .map((f) => auto[f])
      .filter((i): i is number => i !== undefined);
    // Everything that describes one file is set from that file, so nothing
    // carries over from the previous import.
    setOptions((o) => ({
      ...o,
      ...(order && { dateOrder: order }),
      // Exchange exports name the symbol column "Asset" or "Currency".
      defaultAssetType: /asset|coin|currency/.test(symbolHeader) ? 'crypto' : 'stock',
      decimalComma: detectDecimalComma(table.rows.flatMap((r) => numberColumns.map((i) => r[i] ?? ''))),
      costFromMarket: kind === 'positions' && auto.price === undefined && auto.costBasis === undefined,
    }));
    setSource({ method: 'table', fileName, table });
    setEdits({});
    setExcluded(new Set());
    setStep(3);
  };

  const readWithAi = async (fileName: string, text: string) => {
    if (!kind) return;
    if (!aiReady) {
      setReadError(
        'This file isn’t a CSV table, so it needs the local AI to read it. Turn on the AI Agent with the Ollama (Local) provider in Settings, or export a CSV from your broker instead.'
      );
      return;
    }
    const controller = new AbortController();
    readAbort.current = controller;
    setAiReading(true);
    const parts = splitForAi(text);
    const rows: RawImportRow[] = [];
    const problems: string[] = [];
    let model = '';
    let cancelledAt: number | null = null;
    for (const [i, part] of parts.entries()) {
      setAiProgress({ part: i + 1, total: parts.length, startedAt: Date.now() });
      try {
        const result = await apis.import.parseDocument(kind, part, controller.signal);
        rows.push(...result.rows);
        problems.push(...result.skipped.map((m) => `Part ${i + 1}: ${m}`));
        model = result.model;
      } catch (err: any) {
        if (controller.signal.aborted) {
          cancelledAt = i;
          break;
        }
        // One slow or unreadable part shouldn't lose the rest of the statement.
        problems.push(
          `Part ${i + 1} of ${parts.length} couldn't be read (${err.message || 'error'}) — check those rows`
        );
      }
    }
    setAiProgress(null);
    if (cancelledAt !== null) {
      problems.push(`Reading was cancelled after ${cancelledAt} of ${parts.length} part(s) — later rows are missing`);
    }
    if (!rows.length) {
      setReadError(
        cancelledAt !== null
          ? 'Reading was cancelled.'
          : problems.length
            ? problems.join(' ')
            : 'The local AI found no rows in this document. Try a CSV export, or a clearer PDF.'
      );
      return;
    }
    const result = { rows, model, skipped: problems };
    const dates = result.rows.map((r) => String(r.date ?? ''));
    const order = detectDateOrder(dates);
    setDateOrderDetected(!!order || dates.every((d) => !d || /^\d{4}-/.test(d)));
    setOptions((o) => ({
      ...o,
      ...(order && { dateOrder: order }),
      defaultAssetType: 'stock',
      decimalComma: false,
      costFromMarket: false,
    }));
    setSource({ method: 'ai', fileName, rows: result.rows, model: result.model, skipped: result.skipped });
    setEdits({});
    setExcluded(new Set());
    setStep(4);
  };

  const readSource = async (fileName: string, getText: () => Promise<string>, forceAi = false) => {
    setReadError('');
    setReading(true);
    try {
      const text = await getText();
      if (!text.trim()) throw new Error('The file is empty');
      if (looksBinary(text)) {
        throw new Error(
          "This doesn't look like a text file. Export a CSV from your broker, or choose the PDF statement itself."
        );
      }
      if (!forceAi && looksTabular(text)) applyTable(fileName, parseTable(text));
      else await readWithAi(fileName, text);
    } catch (err: any) {
      setReadError(err.message || 'Could not read the file');
    } finally {
      readAbort.current = null;
      setAiReading(false);
      setReading(false);
    }
  };

  const cancelReading = () => readAbort.current?.abort();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: false,
    disabled: reading,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/x-ofx': ['.ofx', '.qfx'],
    },
    onDrop: (files) => {
      const file = files[0];
      if (file) readSource(file.name, () => readFileText(file), isPdf(file));
    },
    onDropRejected: () => setReadError('That file type isn’t supported. Use CSV, TSV, TXT, PDF, OFX or QFX.'),
  });

  const missingRequired = kind ? REQUIRED_FOR[kind].filter((f) => mapping[f] === undefined) : [];
  const noCostColumn = kind === 'positions' && mapping.price === undefined && mapping.costBasis === undefined;
  const needsPrice = kind === 'history' && mapping.price === undefined && mapping.amount === undefined;
  const accountsInFile = source?.method === 'table' ? accountValues(source.table, mapping) : [];
  const columnsReady = !missingRequired.length && !needsPrice && (accountsInFile.length <= 1 || !!sourceAccount);

  // Unticks are per row of what's being reviewed; after changing columns or
  // the source account the rows are different, so they start ticked again.
  const goToReview = () => {
    setPlan(null);
    setExcluded(new Set());
    setEdits({});
    if (noCostColumn) setOptions((o) => ({ ...o, costFromMarket: true }));
    setStep(4);
  };

  // A reload loses the file and every choice made for it.
  React.useEffect(() => {
    if ((!source && !reading) || step >= 5) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [source, step, reading]);

  const commit = async () => {
    if (!request) return;
    setConfirmReplace(false);
    setCommitting(true);
    try {
      const done = await apis.import.commit(request);
      setResult(done);
      setStep(5);
      toast.success(`Imported into ${done.account.name}`);
      loadAccounts();
      loadRuns();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setCommitting(false);
    }
  };

  const startOver = (keepAccount: boolean) => {
    setStep(0);
    setKind(null);
    setSource(null);
    setPlan(null);
    setResult(null);
    setExcluded(new Set());
    setPasted('');
    setReadError('');
    if (!keepAccount) setAccountId('');
    setOptions((o) => ({ ...o, mode: 'add' }));
  };

  // ------------------------------------------------------------ render --

  const back = (to: number) => (
    <Button onClick={() => setStep(to)} disabled={committing}>
      Back
    </Button>
  );

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <PageHeader
        title="Import"
        subtitle="Bring in your positions, tax lots and history from your broker — nothing is saved until you review it"
      />

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, display: { xs: 'none', sm: 'flex' } }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Typography sx={{ display: { xs: 'block', sm: 'none' }, mb: 2, fontSize: '0.85rem', color: 'text.secondary' }}>
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </Typography>

      {step === 0 && (
        <Stack spacing={2}>
          <Typography sx={{ fontWeight: 600 }}>What are you importing?</Typography>
          <Grid container spacing={2}>
            {KINDS.map((k) => (
              <Grid key={k.kind} size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => chooseKind(k.kind)} sx={{ p: 2.5, height: '100%' }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Iconify icon={k.icon} width={22} sx={{ color: 'primary.main' }} />
                        <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{k.title}</Typography>
                      </Stack>
                      <Typography sx={{ fontSize: '0.88rem' }}>{k.body}</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>e.g. {k.examples}</Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Alert severity="info" icon={<Iconify icon="tabler:bulb" />}>
            <strong>Have both?</strong> Import your current positions first, then your history with “Record as history
            only”, so your holdings come from the positions file and realized gains from the history. If your history
            goes back to your very first purchase, the history alone is enough.
          </Alert>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            Moving from another machine? Restore a full backup under{' '}
            <Link component={RouterLink} to="/settings?tab=data">
              Settings → Data & Backups
            </Link>{' '}
            instead.
          </Typography>
        </Stack>
      )}

      {step === 1 && kind && (
        <Panel title="Which account is this file for?" icon="tabler:building-bank">
          <Stack spacing={2} sx={{ maxWidth: 640 }}>
            {accounts === null ? (
              <LinearProgress />
            ) : (
              <TextField
                select
                label="Account"
                value={accountId}
                onChange={(e) => {
                  setAccountId(e.target.value);
                  setOptions((o) => ({ ...o, mode: 'add' }));
                }}
                helperText="Each brokerage account is imported separately"
              >
                {accounts.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                    <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1 }}>
                      {counts[a.id]?.positions ?? 0} positions · {counts[a.id]?.transactions ?? 0} transactions
                    </Typography>
                  </MenuItem>
                ))}
                <MenuItem value={NEW_ACCOUNT}>
                  <Iconify icon="tabler:plus" width={16} sx={{ mr: 1 }} />
                  New account…
                </MenuItem>
              </TextField>
            )}

            {(accountId === NEW_ACCOUNT || accounts?.length === 0) && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
                <TextField
                  label="New account name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  slotProps={{ htmlInput: { maxLength: 50 } }}
                  placeholder="e.g. Fidelity Brokerage"
                  sx={{ flex: 1 }}
                />
                <TextField
                  select
                  label="Tax treatment"
                  value={newTaxType}
                  onChange={(e) => setNewTaxType(e.target.value as AccountTaxType)}
                  sx={{ minWidth: 240 }}
                >
                  {(Object.keys(ACCOUNT_TAX_TYPE_LABELS) as AccountTaxType[]).map((t) => (
                    <MenuItem key={t} value={t}>
                      {ACCOUNT_TAX_TYPE_LABELS[t]}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  onClick={createAccount}
                  disabled={!newName.trim() || creating}
                  sx={{ height: 56 }}
                >
                  {creating ? 'Creating…' : 'Create'}
                </Button>
              </Stack>
            )}

            {accountId && accountId !== NEW_ACCOUNT && hasExisting && (
              <Box>
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>
                  {accountName(accountId)} already has {existing.positions} position(s) and {existing.transactions}{' '}
                  transaction(s).
                </Typography>
                <RadioGroup
                  value={options.mode}
                  onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as ImportOptions['mode'] }))}
                >
                  <FormControlLabel
                    value="add"
                    control={<Radio />}
                    label={
                      kind === 'positions'
                        ? 'Update from this file — each symbol in the file replaces what this account holds for it; other positions stay'
                        : 'Add to what’s there — trades and cash movements already in the account are skipped as duplicates'
                    }
                  />
                  <FormControlLabel
                    value="replace"
                    control={<Radio />}
                    label={
                      kind === 'history'
                        ? 'Start fresh — remove this account’s positions and transactions first (history-only imports remove just the transactions)'
                        : 'Start fresh — remove this account’s positions and transactions first'
                    }
                  />
                </RadioGroup>
              </Box>
            )}

            <Stack direction="row" spacing={1}>
              {back(0)}
              <Button
                variant="contained"
                disabled={!accountId || accountId === NEW_ACCOUNT}
                onClick={() => {
                  if (kind === 'history') {
                    setOptions((o) => ({
                      ...o,
                      historyMode: o.mode === 'add' && existing.positions > 0 ? 'record' : 'build',
                    }));
                  }
                  setStep(2);
                }}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        </Panel>
      )}

      {step === 2 && kind && (
        <Panel title={`Choose your ${kind === 'positions' ? 'positions' : 'history'} file`} icon="tabler:file-upload">
          <Stack spacing={2}>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: reading ? 'progress' : 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'transparent',
              }}
            >
              <input {...getInputProps()} aria-label="Choose a file to import" />
              <Iconify icon="tabler:cloud-upload" width={36} sx={{ color: 'primary.main', mb: 1 }} />
              <Typography sx={{ fontWeight: 600 }}>Drop a file here, or click to choose</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                CSV or TSV exports are read directly. PDF, OFX/QFX and text statements are read by your local AI.
              </Typography>
            </Box>
            {reading && (
              <Box>
                <LinearProgress />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    {aiProgress
                      ? `Local AI reading part ${aiProgress.part} of ${aiProgress.total} · ${Math.max(0, Math.round((now - aiProgress.startedAt) / 1000))} s — each part can take a minute or two on a CPU`
                      : 'Reading…'}
                  </Typography>
                  {aiReading && (
                    <Button size="small" onClick={cancelReading}>
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
            {readError && <Alert severity="error">{readError}</Alert>}
            <TextField
              label="…or paste the text of a statement"
              multiline
              minRows={4}
              maxRows={12}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              disabled={reading}
            />
            {aiReady === false && (
              <Alert severity="info" icon={<Iconify icon="tabler:shield-lock" />}>
                CSV files need nothing else. To read PDFs and other statements, turn on the AI Agent with the{' '}
                <strong>Ollama (Local)</strong> provider in{' '}
                <Link component={RouterLink} to="/settings?tab=ai">
                  Settings
                </Link>{' '}
                — statements are only ever read by a model on your own machine.
              </Alert>
            )}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {back(1)}
              {source && !reading && (
                <Button variant="outlined" onClick={() => setStep(source.method === 'table' ? 3 : 4)}>
                  Continue with {source.fileName}
                </Button>
              )}
              <Button
                variant="contained"
                disabled={!pasted.trim() || reading}
                onClick={() => readSource('Pasted text', async () => pasted)}
              >
                Read pasted text
              </Button>
            </Stack>
          </Stack>
        </Panel>
      )}

      {step === 3 && kind && source?.method === 'table' && (
        <Panel
          title="Check the columns"
          subtitle={`${source.fileName} · ${source.table.rows.length} rows${source.table.preambleLines ? ` · ${source.table.preambleLines} header line(s) above the table ignored` : ''}`}
          icon="tabler:columns"
        >
          <Stack spacing={2}>
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Columns were matched automatically. Change any that are wrong; leave a field as “Not in file” when the
              file doesn’t have it.
            </Typography>
            <Grid container spacing={1.5}>
              {FIELDS_FOR[kind].map((field: ImportField) => {
                const required = REQUIRED_FOR[kind].includes(field);
                const missing = required && mapping[field] === undefined;
                const sample = mapping[field] !== undefined ? source.table.rows[0]?.[mapping[field] as number] : '';
                return (
                  <Grid key={field} size={{ xs: 12, sm: 6, md: 4 }}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label={`${FIELD_LABELS[field]}${required ? ' *' : ''}`}
                      value={mapping[field] ?? ''}
                      error={missing}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : Number(e.target.value);
                        setMapping((m) => ({ ...m, [field]: value }));
                        if (field === 'account') setSourceAccount('');
                      }}
                      helperText={
                        missing ? 'Required' : sample ? `e.g. ${String(sample).slice(0, 40)}` : FIELD_HELP[kind][field]
                      }
                    >
                      <MenuItem value="">
                        <em>Not in file</em>
                      </MenuItem>
                      {source.table.headers.map((h, i) => (
                        <MenuItem key={`${h}-${i}`} value={i}>
                          {h}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                );
              })}
            </Grid>
            {noCostColumn && (
              <Alert severity="warning">
                There’s no cost column. Choose one for <strong>Price per share</strong> (average cost) or{' '}
                <strong>Total cost</strong> if the file has it — tax lots need what you paid. Otherwise each position
                takes today’s price as an estimated cost (gains start at zero) that you can correct on its Research
                page.
              </Alert>
            )}
            {needsPrice && (
              <Alert severity="warning">
                Choose a column for <strong>Price per share</strong> or <strong>Amount</strong>.
              </Alert>
            )}
            {accountsInFile.length > 1 && (
              <TextField
                select
                size="small"
                label="This file has several accounts — which one goes into this account?"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                sx={{ maxWidth: 520 }}
                helperText="Import the others into their own accounts afterwards"
              >
                {accountsInFile.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v} ({source.table.rows.filter((r) => r[mapping.account as number] === v).length} rows)
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Box sx={{ overflowX: 'auto' }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>
                First rows of the file
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {source.table.headers.map((h, i) => (
                      <TableCell key={`${h}-${i}`} sx={{ fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {source.table.rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {r.map((c, j) => (
                        <TableCell
                          key={j}
                          sx={{
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                            maxWidth: 220,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {c}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Stack direction="row" spacing={1}>
              {back(2)}
              <Button variant="contained" disabled={!columnsReady} onClick={goToReview}>
                Review import
              </Button>
            </Stack>
          </Stack>
        </Panel>
      )}

      {step === 4 && kind && source && (
        <Stack spacing={2}>
          {source.method === 'ai' && (
            <Alert severity="warning" icon={<Iconify icon="tabler:robot" />}>
              <strong>Check these rows against your statement.</strong> They were read by your local model (
              {source.model}), which can miss lines or misread numbers, dates and types. Use the pencil on any row to
              correct it.
              {source.skipped.length > 0 && ` ${source.skipped.join('. ')}.`}
            </Alert>
          )}
          {previewError && <Alert severity="error">{previewError}</Alert>}
          <ImportReview
            kind={kind}
            plan={plan}
            loading={previewing}
            options={options}
            onOptionsChange={setOptions}
            excluded={excluded}
            onExcludedChange={setExcluded}
            lineNumbers={built.lineNumbers}
            editedRows={new Set(Object.keys(edits).map(Number))}
            onEditRow={setEditing}
            dateOrderDetected={dateOrderDetected}
          />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {back(source.method === 'table' ? 3 : 2)}
            <Button
              variant="contained"
              disabled={!plan?.canCommit || previewing || committing}
              onClick={() => (options.mode === 'replace' ? setConfirmReplace(true) : commit())}
            >
              {committing ? 'Importing…' : `Import into ${accountName(accountId)}`}
            </Button>
            {plan && !plan.canCommit && !previewing && (
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {plan.summary.errors ? 'Resolve or untick the rows with problems first' : 'Nothing to import yet'}
              </Typography>
            )}
          </Stack>
        </Stack>
      )}

      {step === 5 && result && (
        <Panel title="Import complete" icon="tabler:circle-check">
          <Stack spacing={2}>
            <Typography>
              {result.kind === 'positions' || result.options.historyMode === 'build'
                ? `${result.account.name} now has ${result.summary.positions} imported position(s) with ${result.summary.lots} tax lot(s)`
                : `${result.summary.transactions} transaction(s) recorded in ${result.account.name}`}
              {result.kind === 'history' && result.options.historyMode === 'build'
                ? `, built from ${result.summary.transactions} transaction(s)`
                : ''}
              .
              {result.summary.cashAfter !== result.summary.cashBefore &&
                ` Cash is now ${fnCurrency(result.summary.cashAfter)}.`}
            </Typography>
            {result.summary.estimatedLots > 0 && (
              <Alert severity="warning">
                {result.summary.estimatedLots} lot(s) had no purchase date and are marked estimated. Set their dates
                from each position’s Research page (Position details → tax lots) so short- and long-term gains are
                right.
              </Alert>
            )}
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
              Prices for new symbols arrive over the next minute or so. Past performance charts skip today, because the
              import changed the portfolio without a trade.
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button variant="contained" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button variant="outlined" onClick={() => startOver(true)}>
                Import another file
              </Button>
              <Button onClick={() => navigate('/database')}>See the records</Button>
            </Stack>
          </Stack>
        </Panel>
      )}

      {runs.length > 0 && step !== 4 && (
        <Panel title="Recent imports" icon="tabler:history" flush sx={{ mt: 3 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['When', 'Account', 'File', 'What', 'Positions', 'Lots', 'Transactions', 'Skipped'].map((h) => (
                    <TableCell key={h} sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {moment(r.createdAt).format('MMM D, h:mm a')}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{accountName(r.accountId)}</TableCell>
                    <TableCell
                      sx={{ fontSize: '0.78rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {r.fileName ?? '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      {r.kind === 'positions'
                        ? 'Positions'
                        : r.historyMode === 'record'
                          ? 'History (record)'
                          : 'History (built positions)'}
                      {r.mode === 'replace' ? ' · fresh start' : ''}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.positions}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.lots}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.transactions}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{r.skipped}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Panel>
      )}

      {editing !== null && kind && (
        <RowEditDialog
          kind={kind}
          row={built.rows[editing] ?? {}}
          line={built.lineNumbers[editing] ?? editing + 1}
          onClose={() => setEditing(null)}
          onSave={(row) => {
            setEdits((e) => ({ ...e, [editing]: row }));
            setExcluded((x) => {
              const next = new Set(x);
              next.delete(editing);
              return next;
            });
            setEditing(null);
          }}
        />
      )}

      <Dialog open={confirmReplace} onClose={() => setConfirmReplace(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Start {accountName(accountId)} fresh?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {plan?.summary.removedPositions ?? 0} position(s) and {plan?.summary.removedTransactions ?? 0}{' '}
            transaction(s) in this account are deleted and replaced by this import. Export a backup first if you might
            need them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmReplace(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={commit}>
            Replace and import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
