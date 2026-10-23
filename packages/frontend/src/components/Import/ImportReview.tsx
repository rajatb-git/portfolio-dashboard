import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';

import type { ImportKind, ImportOptions, ImportPlan, PlannedRow, RowStatus } from '@/api/import';
import Panel from '@/components/ui/Panel';
import { fnCurrency } from '@/utils/formatNumber';

const STATUS: Record<RowStatus, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
  ok: { label: 'Ready', color: 'success' },
  warning: { label: 'Check', color: 'warning' },
  error: { label: 'Problem', color: 'error' },
  skipped: { label: 'Skipped', color: 'default' },
  duplicate: { label: 'Duplicate', color: 'info' },
  excluded: { label: 'Unticked', color: 'default' },
};

type Filter = 'all' | 'problems' | 'skipped';
const PAGE_SIZE = 50;

type Props = {
  kind: ImportKind;
  plan: ImportPlan | null;
  loading: boolean;
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
  excluded: Set<number>;
  onExcludedChange: (excluded: Set<number>) => void;
  // File line number for each row, so messages can be traced back to the file.
  lineNumbers: number[];
  dateOrderDetected: boolean;
};

const qtyText = (n?: number) => (n === undefined ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 8 }));

function Figure({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography
        sx={{ fontSize: '0.7rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: tone ?? 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

export default function ImportReview({
  kind,
  plan,
  loading,
  options,
  onOptionsChange,
  excluded,
  onExcludedChange,
  lineNumbers,
  dateOrderDetected,
}: Props) {
  const [filter, setFilter] = React.useState<Filter>('all');
  const [page, setPage] = React.useState(0);
  const set = (partial: Partial<ImportOptions>) => onOptionsChange({ ...options, ...partial });

  const rows = plan?.rows ?? [];
  const visible = rows.filter((r) =>
    filter === 'problems'
      ? r.status === 'error' || r.status === 'warning'
      : filter === 'skipped'
        ? r.status === 'skipped' || r.status === 'duplicate' || r.status === 'excluded'
        : true
  );
  React.useEffect(() => setPage(0), [filter]);

  const toggle = (row: PlannedRow) => {
    const next = new Set(excluded);
    if (next.has(row.index)) next.delete(row.index);
    else next.add(row.index);
    onExcludedChange(next);
  };
  const untickProblems = () => {
    const next = new Set(excluded);
    for (const r of rows) if (r.status === 'error') next.add(r.index);
    onExcludedChange(next);
  };

  const s = plan?.summary;
  const recordOnly = kind === 'history' && options.historyMode === 'record';

  return (
    <Stack spacing={2}>
      <Panel title="Import settings" icon="tabler:adjustments" dense>
        <Stack spacing={1.5}>
          {kind === 'history' && (
            <Box>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, mb: 0.5 }}>What should the history do?</Typography>
              <RadioGroup
                value={options.historyMode}
                onChange={(e) => set({ historyMode: e.target.value as ImportOptions['historyMode'] })}
              >
                <FormControlLabel
                  value="build"
                  control={<Radio size="small" />}
                  label={
                    <Typography sx={{ fontSize: '0.82rem' }}>
                      <strong>Build positions and tax lots</strong> — replays every buy and sell (oldest first, sells
                      relieve the oldest lots). Use when the file goes back to your first purchase.
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="record"
                  control={<Radio size="small" />}
                  label={
                    <Typography sx={{ fontSize: '0.82rem' }}>
                      <strong>Record as history only</strong> — for realized gains and analytics. Use when your current
                      positions come from a positions file.
                    </Typography>
                  }
                />
              </RadioGroup>
            </Box>
          )}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              select
              size="small"
              label="Date format"
              value={options.dateOrder}
              onChange={(e) => set({ dateOrder: e.target.value as ImportOptions['dateOrder'] })}
              helperText={dateOrderDetected ? 'Detected from the file' : 'Check a few dates below'}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="MDY">Month/Day/Year (US)</MenuItem>
              <MenuItem value="DMY">Day/Month/Year</MenuItem>
              <MenuItem value="YMD">Year/Month/Day</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Asset type when not given"
              value={options.defaultAssetType}
              onChange={(e) => set({ defaultAssetType: e.target.value as ImportOptions['defaultAssetType'] })}
              helperText="Pairs like BTC-USD are always crypto"
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="stock">Stocks & ETFs</MenuItem>
              <MenuItem value="crypto">Crypto</MenuItem>
            </TextField>
            <FormControlLabel
              control={<Switch checked={options.applyCash} onChange={(_, v) => set({ applyCash: v })} />}
              label={
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                    {kind === 'positions' ? 'Set cash from this file' : 'Update cash from these rows'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    {kind === 'positions'
                      ? 'Cash and money-market rows become the account’s cash balance'
                      : 'Deposits, withdrawals, buys and sells move the cash balance. Dividends and interest aren’t imported, so it may need a final adjustment'}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={<Switch checked={options.decimalComma} onChange={(_, v) => set({ decimalComma: v })} />}
              label={
                <Box>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>Numbers use decimal commas</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                    For files written as 1.234,56 instead of 1,234.56
                  </Typography>
                </Box>
              }
            />
            {kind === 'positions' && (
              <FormControlLabel
                control={<Switch checked={options.costFromMarket} onChange={(_, v) => set({ costFromMarket: v })} />}
                label={
                  <Box>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
                      Use today’s price when there’s no cost
                    </Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                      Rows without a cost get an estimated cost at today’s price, so gains start at zero until you enter
                      the real cost
                    </Typography>
                  </Box>
                }
              />
            )}
          </Stack>
        </Stack>
      </Panel>

      <Panel title="Summary" icon="tabler:list-check" dense>
        {!s || (loading && !plan) ? (
          <Skeleton variant="rounded" height={64} />
        ) : (
          <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 3 }}>
              <Figure label="Rows read" value={s.rows} />
              <Figure label="Will import" value={s.imported} tone="var(--pd-up)" />
              {!recordOnly && <Figure label="Positions" value={s.positions} />}
              {!recordOnly && (
                <Figure
                  label="Tax lots"
                  value={
                    <>
                      {s.lots}
                      {s.estimatedLots > 0 && (
                        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'warning.main', ml: 0.5 }}>
                          ({s.estimatedLots} undated)
                        </Typography>
                      )}
                    </>
                  }
                />
              )}
              {kind === 'history' && <Figure label="Transactions" value={s.transactions} />}
              {kind === 'history' && !recordOnly && (
                <Figure
                  label="Realized gain"
                  value={fnCurrency(s.realizedGain)}
                  tone={s.realizedGain >= 0 ? 'var(--pd-up)' : 'var(--pd-down)'}
                />
              )}
              <Figure
                label="Cash"
                value={
                  s.cashAfter === s.cashBefore ? (
                    'unchanged'
                  ) : (
                    <>
                      {fnCurrency(s.cashBefore)} → {fnCurrency(s.cashAfter)}
                    </>
                  )
                }
              />
              <Figure label="Skipped" value={s.skipped + s.duplicates + s.excluded} />
              <Figure label="Problems" value={s.errors} tone={s.errors ? 'var(--pd-down)' : undefined} />
            </Stack>
            {(s.removedPositions > 0 || s.removedTransactions > 0) && (
              <Alert severity="warning" sx={{ py: 0 }}>
                Starting fresh removes this account’s {s.removedPositions} position(s) and {s.removedTransactions}{' '}
                transaction(s) before importing.
              </Alert>
            )}
            {s.errors > 0 && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={untickProblems}>
                    Untick them
                  </Button>
                }
              >
                {s.errors} row(s) can’t be imported as they are. Fix them in the file and choose it again, or untick
                them to import the rest.
              </Alert>
            )}
            {s.duplicates > 0 && (
              <Alert severity="info" sx={{ py: 0 }}>
                {s.duplicates} row(s) are already in this account and will be skipped.
              </Alert>
            )}
            {s.replacedPositions > 0 && (
              <Alert severity="info" sx={{ py: 0 }}>
                {s.replacedPositions} position(s) this account already holds are replaced by the file’s lots — see the
                quantities before and after below.
              </Alert>
            )}
            {s.missingCost > 0 && (
              <Alert severity="warning" sx={{ py: 0 }}>
                {s.missingCost} lot(s) use today’s price as an estimated cost. Enter the real cost on each position’s
                Research page so gains and taxes are right.
              </Alert>
            )}
            {s.cashAfter < 0 && s.cashAfter !== s.cashBefore && (
              <Alert severity="warning" sx={{ py: 0 }}>
                Cash would end at {fnCurrency(s.cashAfter)}. The file probably doesn’t include every deposit (or the
                dividends that paid for some buys) — consider turning off “Update cash from these rows” and setting the
                balance yourself.
              </Alert>
            )}
          </Stack>
        )}
      </Panel>

      {plan && plan.positions.length > 0 && (
        <Panel title="Positions after the import" subtitle={`${plan.account.name}`} icon="tabler:briefcase" flush>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Symbol', 'Name', 'Type', 'Quantity', 'Avg cost', 'Lots', 'Change'].map((h) => (
                    <TableCell key={h} sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {plan.positions.map((p) => (
                  <TableRow key={p.symbol} sx={{ opacity: p.change === 'removed' || p.change === 'closed' ? 0.6 : 1 }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{p.symbol}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', maxWidth: 260 }}>{p.name}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{p.type === 'crypto' ? 'Crypto' : 'Stock'}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {p.previousQty !== undefined && (
                        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {qtyText(p.previousQty)} →{' '}
                        </Typography>
                      )}
                      {qtyText(p.qty)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>{fnCurrency(p.averagePrice)}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      {p.lots}
                      {p.estimatedLots > 0 && (
                        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'warning.main', ml: 0.5 }}>
                          ({p.estimatedLots} undated)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={
                          {
                            new: 'New',
                            updated: 'Updated',
                            unchanged: 'No change',
                            removed: 'Removed',
                            closed: 'Sold out',
                          }[p.change]
                        }
                        color={p.change === 'new' ? 'success' : p.change === 'updated' ? 'info' : 'default'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.68rem' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Panel>
      )}

      <Panel title="Rows" icon="tabler:table" flush>
        <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ px: 1, minHeight: 40 }}>
          <Tab value="all" label={`All (${rows.length})`} sx={{ minHeight: 40, textTransform: 'none' }} />
          <Tab
            value="problems"
            label={`Problems & checks (${s ? s.errors + s.warnings : 0})`}
            sx={{ minHeight: 40, textTransform: 'none' }}
          />
          <Tab
            value="skipped"
            label={`Skipped (${s ? s.skipped + s.duplicates + s.excluded : 0})`}
            sx={{ minHeight: 40, textTransform: 'none' }}
          />
        </Tabs>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {[
                  'Line',
                  'Status',
                  kind === 'history' ? 'Action' : 'Type',
                  'Symbol',
                  'Quantity',
                  'Price',
                  'Date',
                  'Note',
                ].map((h) => (
                  <TableCell key={h} sx={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((r) => (
                <TableRow key={r.index} sx={{ opacity: r.status === 'excluded' || r.status === 'skipped' ? 0.65 : 1 }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={!excluded.has(r.index) && r.status !== 'skipped' && r.status !== 'duplicate'}
                      onChange={() => toggle(r)}
                      disabled={r.status === 'skipped' || r.status === 'duplicate'}
                      slotProps={{ input: { 'aria-label': `Import line ${lineNumbers[r.index] ?? r.index + 1}` } }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {lineNumbers[r.index] ?? r.index + 1}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS[r.status].label}
                      color={STATUS[r.status].color}
                      variant={r.status === 'ok' ? 'outlined' : 'filled'}
                      sx={{ height: 20, fontSize: '0.68rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    {kind === 'history' ? (r.action ?? '') : (r.type ?? '')}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{r.symbol ?? ''}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{qtyText(r.qty)}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{r.price !== undefined ? fnCurrency(r.price) : ''}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{r.date ?? ''}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 220 }}>
                    {r.messages.join(' · ')}
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
                    Nothing here.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        {visible.length > PAGE_SIZE && (
          <TablePagination
            component="div"
            count={visible.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
          />
        )}
      </Panel>
    </Stack>
  );
}
