import * as React from 'react';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import debounce from 'lodash/debounce';
import moment from 'moment';
import { toast } from 'react-toastify';

import apis from '@/api';
import {
  LOT_METHOD_LABELS,
  type LotMethod,
  type SimulatedPosition,
  type SimulationRequest,
  type SymbolPosition,
  type TradeSimulation,
} from '@/api/holdings';
import { Iconify } from '@/components/Iconify';
import TermChip from '@/components/Tax/TermChip';
import type { IAccount } from '@/models/AccountsModel';
import { fnCurrency } from '@/utils/formatNumber';

export type MockTradeInitial = {
  action?: 'buy' | 'sell';
  symbol?: string;
  accountId?: string;
  qty?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: IAccount[];
  initial?: MockTradeInitial;
};

const NUMERIC = /^\d*\.?\d+$/;
const gainColor = (v: number) => (v >= 0 ? 'var(--pd-up)' : 'var(--pd-down)');
const signed = (v: number) => `${v >= 0 ? '+' : ''}${fnCurrency(v)}`;

function Figure({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <Box>
      <Typography
        sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.04em' }}
      >
        {label}
      </Typography>
      <Typography data-numeric="" sx={{ fontSize: '1.05rem', fontWeight: 700, color: color ?? 'text.primary' }}>
        {value}
      </Typography>
      {sub && <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{sub}</Typography>}
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        color: 'text.secondary',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        mb: 0.75,
      }}
    >
      {children}
    </Typography>
  );
}

const headCell = {
  fontSize: '0.66rem',
  color: 'text.disabled',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
} as const;
const bodyCell = { fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

export default function MockTradeDialog({ open, onClose, accounts, initial }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [action, setAction] = React.useState<'buy' | 'sell'>(initial?.action ?? 'sell');
  const [symbol, setSymbol] = React.useState(initial?.symbol ?? '');
  const [accountId, setAccountId] = React.useState(initial?.accountId ?? '');
  const [qty, setQty] = React.useState(initial?.qty ? String(initial.qty) : '');
  const [price, setPrice] = React.useState('');
  const [date, setDate] = React.useState(moment().format('YYYY-MM-DD'));
  const [assetType, setAssetType] = React.useState<'stock' | 'crypto'>('stock');
  const [lotMethod, setLotMethod] = React.useState<LotMethod>('fifo');
  const [lotIds, setLotIds] = React.useState<string[]>([]);

  const [positions, setPositions] = React.useState<SymbolPosition[]>([]);
  const [result, setResult] = React.useState<TradeSimulation | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const requestSeq = React.useRef(0);

  React.useEffect(() => {
    if (!open) return;
    setAction(initial?.action ?? 'sell');
    setSymbol(initial?.symbol ?? '');
    setAccountId(initial?.accountId ?? '');
    setQty(initial?.qty ? String(initial.qty) : '');
    setPrice('');
    setDate(moment().format('YYYY-MM-DD'));
    setLotMethod('fifo');
    setLotIds([]);
    setResult(null);
    setError(null);
  }, [open]);

  const loadPositions = React.useMemo(
    () =>
      debounce((ticker: string) => {
        if (!ticker) {
          setPositions([]);
          return;
        }
        apis.holdings
          .getBySymbol(ticker)
          .then((res) => setPositions(res ?? []))
          .catch((err) => {
            setPositions([]);
            toast.error(err.message || 'Failed to load positions', { toastId: 'mock-trade-positions' });
          });
      }, 400),
    []
  );

  React.useEffect(() => {
    if (open) loadPositions(symbol.trim().toUpperCase());
  }, [open, symbol]);

  const held = positions.find((p) => p.accountId === accountId);

  // Default to the account that actually holds the symbol when selling.
  React.useEffect(() => {
    if (!positions.length) return;
    if (!accountId || (action === 'sell' && !positions.some((p) => p.accountId === accountId))) {
      setAccountId(positions[0].accountId);
    }
  }, [positions, action]);

  React.useEffect(() => setLotIds([]), [accountId, symbol]);

  const qtyNum = Number(qty);
  const qtyError =
    qty.trim() === ''
      ? ''
      : !NUMERIC.test(qty.trim()) || qtyNum <= 0
        ? 'Enter a positive quantity'
        : action === 'sell' && held && qtyNum > held.qty
          ? `You hold ${held.qty.toLocaleString()}`
          : '';
  const priceError = price.trim() !== '' && !NUMERIC.test(price.trim()) ? 'Enter a valid price' : '';
  const dateError = !moment(date, 'YYYY-MM-DD', true).isValid() ? 'Enter a valid date' : '';
  const specificError =
    action === 'sell' && lotMethod === 'specific' && lotIds.length === 0 ? 'Pick at least one lot' : '';

  const request: SimulationRequest | null =
    symbol.trim() &&
    accountId &&
    qty.trim() &&
    !qtyError &&
    !priceError &&
    !dateError &&
    !specificError &&
    (action === 'buy' || held)
      ? {
          action,
          symbol: symbol.trim().toUpperCase(),
          accountId,
          qty: qtyNum,
          date,
          ...(price.trim() && { price: Number(price) }),
          ...(action === 'buy' && !positions.length && { type: assetType }),
          ...(action === 'sell' && { lotMethod, ...(lotMethod === 'specific' && { lotIds }) }),
        }
      : null;
  const requestKey = request ? JSON.stringify(request) : '';

  const runSimulation = React.useMemo(
    () =>
      debounce((req: SimulationRequest) => {
        const seq = ++requestSeq.current;
        setIsSimulating(true);
        apis.holdings
          .simulate(req)
          .then((res) => {
            if (seq !== requestSeq.current) return;
            setResult(res);
            setError(null);
          })
          .catch((err) => {
            if (seq !== requestSeq.current) return;
            const message = err.message || 'Failed to simulate trade';
            setResult(null);
            setError(message);
            toast.error(message, { toastId: message });
          })
          .finally(() => {
            if (seq === requestSeq.current) setIsSimulating(false);
          });
      }, 450),
    []
  );

  React.useEffect(() => {
    if (!open) return;
    if (request) {
      runSimulation(request);
    } else {
      runSimulation.cancel();
      requestSeq.current += 1;
      setIsSimulating(false);
      setResult(null);
      setError(null);
    }
  }, [open, requestKey]);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;
  const showResult = result && result.action === action;

  const toggleLot = (id: string) => setLotIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Iconify icon="tabler:flask" width={20} sx={{ color: 'primary.main' }} />
        Mock trade
        <Chip label="Simulation — nothing is saved" size="small" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 'auto' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={action}
              onChange={(_, v) => v && setAction(v)}
              aria-label="Buy or sell"
            >
              <ToggleButton value="buy" sx={{ px: 2 }}>
                Buy
              </ToggleButton>
              <ToggleButton value="sell" sx={{ px: 2 }}>
                Sell
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              label="Symbol"
              size="small"
              fullWidth
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              label="Account"
              size="small"
              fullWidth
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              error={action === 'sell' && !!accountId && !!symbol && !held && positions.length > 0}
              helperText={
                action === 'sell' && accountId && symbol && !held ? `No ${symbol.toUpperCase()} in this account` : ''
              }
            >
              {accounts.map((a) => {
                const pos = positions.find((p) => p.accountId === a.id);
                return (
                  <MenuItem key={a.id} value={a.id}>
                    {a.name}
                    {pos && (
                      <Typography component="span" sx={{ fontSize: '0.72rem', color: 'text.disabled', ml: 1 }}>
                        {pos.qty.toLocaleString()} held
                      </Typography>
                    )}
                  </MenuItem>
                );
              })}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              label="Quantity"
              size="small"
              fullWidth
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              error={!!qtyError}
              helperText={
                qtyError ||
                (action === 'sell' && held ? (
                  <Box
                    component="span"
                    role="button"
                    onClick={() => setQty(String(held.qty))}
                    sx={{ cursor: 'pointer', color: 'primary.main' }}
                  >
                    Sell all {held.qty.toLocaleString()}
                  </Box>
                ) : (
                  ''
                ))
              }
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              label="Price"
              size="small"
              fullWidth
              value={price}
              placeholder={positions[0] ? String(positions[0].currentPrice) : 'Market'}
              onChange={(e) => setPrice(e.target.value)}
              error={!!priceError}
              helperText={priceError || 'Blank = live price'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 2 }}>
            <TextField
              label={action === 'sell' ? 'Sale date' : 'Buy date'}
              type="date"
              size="small"
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
              error={!!dateError}
              helperText={dateError || 'Future dates OK'}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          {action === 'sell' && (
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="Lot selection"
                size="small"
                fullWidth
                value={lotMethod}
                onChange={(e) => setLotMethod(e.target.value as LotMethod)}
              >
                {(Object.keys(LOT_METHOD_LABELS) as LotMethod[]).map((m) => (
                  <MenuItem key={m} value={m}>
                    {LOT_METHOD_LABELS[m]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          {action === 'buy' && symbol.trim() && positions.length === 0 && (
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                select
                label="Type"
                size="small"
                fullWidth
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as 'stock' | 'crypto')}
              >
                <MenuItem value="stock">Stock</MenuItem>
                <MenuItem value="crypto">Crypto</MenuItem>
              </TextField>
            </Grid>
          )}
        </Grid>

        {action === 'sell' && lotMethod === 'specific' && held && (
          <Box sx={{ mt: 2 }}>
            <SectionLabel>Choose lots to sell {specificError && `— ${specificError}`}</SectionLabel>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    {['Acquired', 'Qty', 'Cost / share', 'Unrealized', 'Term'].map((h) => (
                      <TableCell key={h} sx={headCell}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {held.lots.map((lot) => (
                    <TableRow key={lot.id} hover onClick={() => toggleLot(lot.id)} sx={{ cursor: 'pointer' }}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={lotIds.includes(lot.id)} />
                      </TableCell>
                      <TableCell sx={bodyCell}>{moment(lot.date).format('MMM D, YYYY')}</TableCell>
                      <TableCell sx={bodyCell}>{lot.qty.toLocaleString()}</TableCell>
                      <TableCell sx={bodyCell}>{fnCurrency(lot.price)}</TableCell>
                      <TableCell sx={{ ...bodyCell, color: gainColor(lot.gain) }}>{signed(lot.gain)}</TableCell>
                      <TableCell sx={bodyCell}>
                        <TermChip term={lot.term} longTermDate={lot.longTermDate} daysToLongTerm={lot.daysToLongTerm} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {!request && !showResult ? (
          <Stack sx={{ alignItems: 'center', py: 5, color: 'text.disabled' }} spacing={1}>
            <Iconify icon="tabler:calculator" width={28} />
            <Typography sx={{ fontSize: '0.82rem', textAlign: 'center' }}>
              Enter a symbol, account and quantity to see the tax and portfolio impact.
            </Typography>
          </Stack>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !showResult ? (
          <Stack spacing={1.5}>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={140} />
          </Stack>
        ) : (
          <SimulationResult
            result={result}
            accountName={accountName(result.accountId)}
            onPickMethod={setLotMethod}
            busy={isSimulating}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mr: 'auto' }}>
          {showResult
            ? `Rates: short-term ${result.config.shortTermRate}% · long-term ${result.config.longTermRate}% · state ${result.config.stateRate}% (Analytics → Realized & Tax). Estimates, not tax advice.`
            : 'Estimates, not tax advice.'}
        </Typography>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function SimulationResult({
  result,
  accountName,
  onPickMethod,
  busy,
}: {
  result: TradeSimulation;
  accountName: string;
  onPickMethod: (method: LotMethod) => void;
  busy: boolean;
}) {
  const isSell = result.action === 'sell';
  const bestTax = result.comparison.length ? Math.min(...result.comparison.map((c) => c.tax)) : 0;

  const rows: Array<{
    label: string;
    pick: (p: SimulatedPosition) => string;
    color?: (p: SimulatedPosition) => string;
  }> = [
    { label: 'Quantity', pick: (p) => p.qty.toLocaleString() },
    { label: 'Average cost', pick: (p) => fnCurrency(p.averagePrice) },
    { label: 'Cost basis', pick: (p) => fnCurrency(p.costBasis) },
    { label: 'Market value', pick: (p) => fnCurrency(p.marketValue) },
    { label: 'Unrealized gain', pick: (p) => signed(p.unrealizedGain), color: (p) => gainColor(p.unrealizedGain) },
    { label: '· short-term', pick: (p) => signed(p.shortTermGain), color: (p) => gainColor(p.shortTermGain) },
    { label: '· long-term', pick: (p) => signed(p.longTermGain), color: (p) => gainColor(p.longTermGain) },
  ];

  return (
    <Stack spacing={2.5} sx={{ opacity: busy ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <Stack direction="row" spacing={3.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {isSell && result.realized && result.tax ? (
          <>
            <Figure
              label="Proceeds"
              value={fnCurrency(result.amount)}
              sub={`${result.qty.toLocaleString()} × ${fnCurrency(result.price)}`}
            />
            <Figure label="Cost basis" value={fnCurrency(result.costBasis ?? 0)} />
            <Figure
              label="Realized gain"
              value={signed(result.realized.total)}
              color={gainColor(result.realized.total)}
              sub={`Short ${signed(result.realized.shortTerm)} · Long ${signed(result.realized.longTerm)}`}
            />
            <Figure
              label={result.tax.total < 0 ? 'Est. tax saved' : 'Est. tax'}
              value={fnCurrency(Math.abs(result.tax.total))}
              color={result.tax.total > 0 ? 'var(--pd-down)' : result.tax.total < 0 ? 'var(--pd-up)' : undefined}
              sub={`Federal ${fnCurrency(result.tax.federal)} · State ${fnCurrency(result.tax.state)}`}
            />
            <Figure label="Net after tax" value={fnCurrency(result.netProceeds ?? 0)} />
          </>
        ) : (
          <>
            <Figure
              label="Cost"
              value={fnCurrency(result.amount)}
              sub={`${result.qty.toLocaleString()} × ${fnCurrency(result.price)}`}
            />
            <Figure
              label="Cash after"
              value={fnCurrency(result.cash.after)}
              color={result.cash.after < 0 ? 'var(--pd-down)' : undefined}
              sub={`${accountName} · was ${fnCurrency(result.cash.before)}`}
            />
            <Figure label="New average cost" value={fnCurrency(result.position.after?.averagePrice ?? result.price)} />
            <Figure label="Long-term from" value={moment(result.lots[0]?.longTermDate).format('MMM D, YYYY')} />
          </>
        )}
      </Stack>

      {isSell && result.tax && (result.tax.ytdShortTerm !== 0 || result.tax.ytdLongTerm !== 0) && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: -1.5 }}>
          Tax is the change on top of {moment(result.date).year()}'s realized gains so far (short{' '}
          {signed(result.tax.ytdShortTerm)}, long {signed(result.tax.ytdLongTerm)}).
        </Typography>
      )}

      {(result.washSale || result.waitForLongTerm || result.notes.length > 0) && (
        <Stack spacing={1}>
          {result.washSale && (
            <Alert
              severity={result.washSale.triggered ? 'warning' : 'info'}
              icon={<Iconify icon="mdi:water-alert-outline" />}
            >
              <strong>{result.washSale.triggered ? 'Wash sale' : 'Wash-sale window'}:</strong> {result.washSale.message}
            </Alert>
          )}
          {result.waitForLongTerm && (
            <Alert severity="success" icon={<Iconify icon="mdi:calendar-clock" />}>
              Waiting until <strong>{moment(result.waitForLongTerm.date).format('MMM D, YYYY')}</strong> (
              {result.waitForLongTerm.daysAway} days) makes {result.waitForLongTerm.qty.toLocaleString()} short-term
              shares long-term and saves roughly <strong>{fnCurrency(result.waitForLongTerm.taxSaving)}</strong> in
              federal tax.
            </Alert>
          )}
          {result.notes.map((n) => (
            <Alert key={n.message} severity={n.severity}>
              {n.message}
            </Alert>
          ))}
        </Stack>
      )}

      <Grid container spacing={2.5}>
        {isSell && result.comparison.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <SectionLabel>Lot selection compared</SectionLabel>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Method', 'Short-term', 'Long-term', 'Est. tax'].map((h) => (
                    <TableCell key={h} sx={headCell} align={h === 'Method' ? 'left' : 'right'}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {result.comparison.map((c) => (
                  <TableRow
                    key={c.method}
                    hover
                    selected={c.method === result.lotMethod}
                    onClick={() => onPickMethod(c.method)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={bodyCell}>
                      {LOT_METHOD_LABELS[c.method]}
                      {c.tax === bestTax && (
                        <Chip
                          label="Lowest"
                          size="small"
                          sx={{
                            ml: 0.75,
                            height: 16,
                            fontSize: '0.6rem',
                            bgcolor: 'var(--pd-up-bg)',
                            color: 'var(--pd-up)',
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ ...bodyCell, color: gainColor(c.shortTermGain) }}>
                      {signed(c.shortTermGain)}
                    </TableCell>
                    <TableCell align="right" sx={{ ...bodyCell, color: gainColor(c.longTermGain) }}>
                      {signed(c.longTermGain)}
                    </TableCell>
                    <TableCell align="right" sx={{ ...bodyCell, fontWeight: 600 }}>
                      {fnCurrency(c.tax)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
        )}

        <Grid size={{ xs: 12, md: isSell ? 6 : 12 }}>
          <SectionLabel>Position in {accountName}</SectionLabel>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCell} />
                <TableCell sx={headCell} align="right">
                  Before
                </TableCell>
                <TableCell sx={headCell} align="right">
                  After
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell sx={{ ...bodyCell, color: 'text.secondary' }}>{r.label}</TableCell>
                  {[result.position.before, result.position.after].map((p, i) => (
                    <TableCell key={i} align="right" sx={{ ...bodyCell, color: p && r.color ? r.color(p) : undefined }}>
                      {p ? r.pick(p) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ ...bodyCell, color: 'text.secondary' }}>Portfolio weight ({result.symbol})</TableCell>
                <TableCell align="right" sx={bodyCell}>
                  {result.portfolioWeight.before.toFixed(2)}%
                </TableCell>
                <TableCell align="right" sx={bodyCell}>
                  {result.portfolioWeight.after.toFixed(2)}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...bodyCell, color: 'text.secondary' }}>Account cash</TableCell>
                <TableCell align="right" sx={bodyCell}>
                  {fnCurrency(result.cash.before)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ ...bodyCell, color: result.cash.after < 0 ? 'var(--pd-down)' : undefined }}
                >
                  {fnCurrency(result.cash.after)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Grid>
      </Grid>

      {isSell && (
        <Box>
          <SectionLabel>Lots sold ({result.lotMethod ? LOT_METHOD_LABELS[result.lotMethod] : ''})</SectionLabel>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Acquired', 'Qty', 'Cost / share', 'Cost basis', 'Proceeds', 'Gain', 'Term'].map((h) => (
                    <TableCell key={h} sx={headCell}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {result.lots.map((lot) => (
                  <TableRow key={lot.lotId}>
                    <TableCell sx={bodyCell}>
                      {moment(lot.acquired).format('MMM D, YYYY')}
                      {lot.estimated && (
                        <Typography component="span" sx={{ fontSize: '0.65rem', color: 'var(--pd-warn)', ml: 0.5 }}>
                          est.
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={bodyCell}>{lot.qty.toLocaleString()}</TableCell>
                    <TableCell sx={bodyCell}>{fnCurrency(lot.costPerShare)}</TableCell>
                    <TableCell sx={bodyCell}>{fnCurrency(lot.costBasis)}</TableCell>
                    <TableCell sx={bodyCell}>{fnCurrency(lot.proceeds)}</TableCell>
                    <TableCell sx={{ ...bodyCell, color: gainColor(lot.gain), fontWeight: 600 }}>
                      {signed(lot.gain)}
                    </TableCell>
                    <TableCell sx={bodyCell}>
                      <TermChip term={lot.term} longTermDate={lot.longTermDate} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
