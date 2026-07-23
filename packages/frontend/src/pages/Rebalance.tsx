import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  InputAdornment,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { RebalancePlan } from '@/api/rebalance';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

type DraftTargets = Record<string, number>;

const round2 = (n: number) => Math.round(n * 100) / 100;
const HOLD_THRESHOLD = 0.5;

export default function Rebalance() {
  const [plan, setPlan] = React.useState<RebalancePlan | null>(null);
  const [saved, setSaved] = React.useState<DraftTargets>({});
  const [draft, setDraft] = React.useState<DraftTargets>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const applyPlan = React.useCallback((p: RebalancePlan) => {
    const targets: DraftTargets = {};
    for (const row of p.rows) targets[row.symbol] = round2(row.targetPercent);
    setPlan(p);
    setSaved(targets);
    setDraft(targets);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    apis.rebalance
      .getPlan()
      .then(applyPlan)
      .catch((err) => toast.error(err.message || 'Failed to load rebalance plan'))
      .finally(() => setLoading(false));
  }, [applyPlan]);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const totalValue = plan?.totalValue ?? 0;
  const totalTarget = round2(Object.values(draft).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
  const totalOff = Math.abs(totalTarget - 100) > 0.1;

  // Recompute drift and suggested trades live from the edited targets so the table
  // reacts as the user types, without a round-trip to the server.
  const rows = React.useMemo(() => {
    if (!plan) return [];
    return plan.rows
      .map((row) => {
        const targetPercent = draft[row.symbol] ?? row.currentPercent;
        const targetValue = (targetPercent / 100) * totalValue;
        const deltaValue = targetValue - row.currentValue;
        const driftPercent = round2(row.currentPercent - targetPercent);
        let action: 'buy' | 'sell' | 'hold' = 'hold';
        if (Math.abs(driftPercent) >= HOLD_THRESHOLD) action = deltaValue > 0 ? 'buy' : 'sell';
        return {
          ...row,
          targetPercent,
          driftPercent,
          action,
          tradeValue: round2(Math.abs(deltaValue)),
          shares: row.currentPrice > 0 ? round2(Math.abs(deltaValue) / row.currentPrice) : 0,
        };
      })
      .sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));
  }, [plan, draft, totalValue]);

  const setTarget = (symbol: string, value: string) => {
    const num = value === '' ? 0 : Number(value);
    if (!Number.isFinite(num)) return;
    setDraft((d) => ({ ...d, [symbol]: num }));
  };

  const handleEqualWeight = () => {
    if (!plan || plan.rows.length === 0) return;
    const each = round2(100 / plan.rows.length);
    const next: DraftTargets = {};
    for (const row of plan.rows) next[row.symbol] = each;
    setDraft(next);
  };

  const handleUseCurrent = () => {
    if (!plan) return;
    const next: DraftTargets = {};
    for (const row of plan.rows) next[row.symbol] = round2(row.currentPercent);
    setDraft(next);
  };

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const targets = plan.rows.map((row) => ({ symbol: row.symbol, targetPercent: draft[row.symbol] ?? 0 }));
      await apis.rebalance.saveTargets(targets);
      const fresh = await apis.rebalance.getPlan();
      applyPlan(fresh);
      toast.success('Target allocation saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save target allocation');
    } finally {
      setSaving(false);
    }
  };

  const actionColor = (a: string) => (a === 'buy' ? '#22c55e' : a === 'sell' ? '#ef4444' : '#94a3b8');

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Rebalance
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {isDirty && (
          <Typography sx={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>Unsaved changes</Typography>
        )}
        <Button variant="outlined" size="small" onClick={handleEqualWeight} sx={{ textTransform: 'none' }}>
          Equal weight
        </Button>
        <Button variant="outlined" size="small" onClick={handleUseCurrent} sx={{ textTransform: 'none' }}>
          Use current
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={!isDirty || saving}
          sx={{ textTransform: 'none' }}
        >
          Save targets
        </Button>
      </Stack>

      <Card variant="outlined">
        <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap', px: 2, py: 1.5, alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
              Portfolio Value
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{fnCurrency(totalValue)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
              Targets Total
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: totalOff ? '#f59e0b' : '#22c55e' }}>
              {totalTarget.toFixed(2)}%
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
              Total Drift
            </Typography>
            <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {rows.reduce((s, r) => s + Math.abs(r.driftPercent), 0).toFixed(2)}%
            </Typography>
          </Box>
          {totalOff && (
            <Chip
              icon={<Iconify icon="mdi:information" width={14} />}
              label="Targets don't sum to 100%"
              size="small"
              sx={{ height: 22, fontSize: '0.68rem', bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
            />
          )}
        </Stack>
        <Divider />

        {loading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={240} />
          </Box>
        ) : rows.length === 0 ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 6, px: 2 }}>
            <Iconify icon="mdi:scale-balance" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', textAlign: 'center' }}>
              No holdings to rebalance yet. Add holdings and their live values will appear here with target-allocation
              controls.
            </Typography>
          </Stack>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Current %
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem', width: 120 }}>
                    Target %
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Drift
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Action
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Trade
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Shares
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.symbol} hover>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      {row.symbol}
                      <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }}>{row.name}</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {fnCurrency(row.currentValue)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {row.currentPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={draft[row.symbol] ?? ''}
                        onChange={(e) => setTarget(row.symbol, e.target.value)}
                        slotProps={{
                          input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                          htmlInput: { min: 0, max: 100, step: 0.5, style: { textAlign: 'right' } },
                        }}
                        sx={{ width: 104, '& input': { fontSize: '0.78rem', py: 0.5 } }}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color: Math.abs(row.driftPercent) < HOLD_THRESHOLD ? 'text.disabled' : actionColor(row.action),
                      }}
                    >
                      {row.driftPercent >= 0 ? '+' : ''}
                      {row.driftPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.action.toUpperCase()}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          bgcolor: `${actionColor(row.action)}22`,
                          color: actionColor(row.action),
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {row.action === 'hold' ? '—' : fnCurrency(row.tradeValue)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {row.action === 'hold' ? '—' : row.shares}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
        Suggested trades bring each position to its target weight at current prices. Share counts are approximate and do
        not account for fractional-share limits, taxes, or trading fees.
      </Typography>
    </Stack>
  );
}
