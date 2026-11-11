import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { ALERT_CONDITION_LABELS, type AlertCondition, type IAlert } from '@/models/AlertModel';
import type { IHoldings } from '@/models/HoldingsModel';
import { fnCurrency } from '@/utils/formatNumber';

export type DraftAlert = {
  id?: string;
  symbol: string;
  type: 'stock' | 'crypto';
  condition: AlertCondition;
  direction: 'above' | 'below';
  targetPrice: string;
  trailPercent: string;
  thresholdPercent: string;
  note: string;
};

export const EMPTY_DRAFT: DraftAlert = {
  symbol: '',
  type: 'stock',
  condition: 'price',
  direction: 'above',
  targetPrice: '',
  trailPercent: '10',
  thresholdPercent: '20',
  note: '',
};

const CONDITION_HELP: Record<AlertCondition, string> = {
  price: 'Fires when the price crosses a fixed level.',
  trailing_stop: 'Fires when the price falls this far below the highest price seen since the alert was created.',
  pct_from_high: 'Fires when the price falls this far below the 52-week high.',
  cost_basis: 'Fires when the price crosses what this position actually cost you across all accounts.',
};

type Props = {
  open: boolean;
  initial: DraftAlert;
  onClose: () => void;
  onSaved: () => void;
};

export default function AlertDialog({ open, initial, onClose, onSaved }: Props) {
  const [draft, setDraft] = React.useState<DraftAlert>(initial);
  const [saving, setSaving] = React.useState(false);
  const [holdings, setHoldings] = React.useState<IHoldings[] | null>(null);

  React.useEffect(() => {
    if (open) setDraft(initial);
    else setHoldings(null);
  }, [open, initial]);

  const needsHoldings = open && draft.condition === 'cost_basis' && holdings === null;
  React.useEffect(() => {
    if (!needsHoldings) return;
    apis.holdings
      .getAll()
      .then(setHoldings)
      .catch((err) => {
        setHoldings([]);
        toast.error(err.message || 'Failed to load your positions');
      });
  }, [needsHoldings]);

  const costBasis = React.useMemo(() => {
    const symbol = draft.symbol.trim().toUpperCase();
    if (!holdings || !symbol) return null;
    const positions = holdings.filter((h) => h.symbol?.toUpperCase() === symbol && h.qty > 0);
    const qty = positions.reduce((sum, h) => sum + h.qty, 0);
    if (qty <= 0) return { qty: 0, basis: 0 };
    return { qty, basis: positions.reduce((sum, h) => sum + h.qty * h.averagePrice, 0) / qty };
  }, [holdings, draft.symbol]);

  const isEdit = !!initial.id;

  const set = (partial: Partial<DraftAlert>) => setDraft((d) => ({ ...d, ...partial }));

  const handleSave = async () => {
    const symbol = draft.symbol.trim().toUpperCase();
    if (!symbol) {
      toast.error('Symbol is required');
      return;
    }

    const note = draft.note.trim() ? { note: draft.note.trim() } : {};
    let payload: IAlert;

    if (draft.condition === 'price') {
      const targetPrice = parseFloat(draft.targetPrice);
      if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
        toast.error('Enter a target price greater than 0');
        return;
      }
      payload = { symbol, type: draft.type, condition: 'price', direction: draft.direction, targetPrice, ...note };
    } else if (draft.condition === 'trailing_stop') {
      const trailPercent = parseFloat(draft.trailPercent);
      if (!Number.isFinite(trailPercent) || trailPercent <= 0 || trailPercent >= 100) {
        toast.error('Enter a trail percent between 0 and 100');
        return;
      }
      payload = {
        symbol,
        type: draft.type,
        condition: 'trailing_stop',
        direction: 'below',
        targetPrice: 0,
        trailPercent,
        ...note,
      };
    } else if (draft.condition === 'pct_from_high') {
      const thresholdPercent = parseFloat(draft.thresholdPercent);
      if (!Number.isFinite(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent >= 100) {
        toast.error('Enter a threshold percent between 0 and 100');
        return;
      }
      payload = {
        symbol,
        type: draft.type,
        condition: 'pct_from_high',
        direction: 'below',
        targetPrice: 0,
        thresholdPercent,
        ...note,
      };
    } else {
      payload = {
        symbol,
        type: draft.type,
        condition: 'cost_basis',
        direction: draft.direction,
        targetPrice: 0,
        ...note,
      };
    }
    setSaving(true);
    try {
      if (isEdit && draft.id) await apis.alerts.update(draft.id, payload);
      else await apis.alerts.create(payload);
      toast.success(isEdit ? 'Alert updated' : 'Alert created');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Edit alert' : 'New alert'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Symbol"
            size="small"
            value={draft.symbol}
            onChange={(e) => set({ symbol: e.target.value.toUpperCase() })}
            placeholder="AAPL, BTC, …"
            fullWidth
            autoFocus
          />
          <Stack direction="row" spacing={1.5}>
            <TextField
              select
              label="Type"
              size="small"
              value={draft.type}
              onChange={(e) => set({ type: e.target.value as DraftAlert['type'] })}
              fullWidth
            >
              <MenuItem value="stock">Stock</MenuItem>
              <MenuItem value="crypto">Crypto</MenuItem>
            </TextField>
            <TextField
              select
              label="Watch"
              size="small"
              value={draft.condition}
              onChange={(e) => set({ condition: e.target.value as AlertCondition })}
              helperText={CONDITION_HELP[draft.condition]}
              fullWidth
            >
              {(Object.keys(ALERT_CONDITION_LABELS) as AlertCondition[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {ALERT_CONDITION_LABELS[key]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {(draft.condition === 'price' || draft.condition === 'cost_basis') && (
            <TextField
              select
              label="Trigger when price"
              size="small"
              value={draft.direction}
              onChange={(e) => set({ direction: e.target.value as DraftAlert['direction'] })}
              fullWidth
            >
              <MenuItem value="above">Rises to / above</MenuItem>
              <MenuItem value="below">Falls to / below</MenuItem>
            </TextField>
          )}
          {draft.condition === 'cost_basis' && costBasis && draft.symbol.trim() && (
            <Alert severity={costBasis.qty > 0 ? 'info' : 'warning'} sx={{ py: 0, fontSize: '0.78rem' }}>
              {costBasis.qty > 0
                ? `Your cost basis in ${draft.symbol.trim().toUpperCase()} is ${fnCurrency(costBasis.basis)} a share across ${costBasis.qty.toLocaleString()} held.`
                : `You don't hold ${draft.symbol.trim().toUpperCase()}, so there's no cost basis to alert on.`}
            </Alert>
          )}
          {draft.condition === 'price' && (
            <TextField
              label="Target price"
              size="small"
              type="number"
              value={draft.targetPrice}
              onChange={(e) => set({ targetPrice: e.target.value })}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              fullWidth
            />
          )}
          {draft.condition === 'trailing_stop' && (
            <TextField
              label="Trail percent"
              size="small"
              type="number"
              value={draft.trailPercent}
              onChange={(e) => set({ trailPercent: e.target.value })}
              slotProps={{ htmlInput: { min: 0.1, max: 99, step: 0.5 } }}
              helperText="The peak starts at today's price and rises with it; the alert fires this far below the peak."
              fullWidth
            />
          )}
          {draft.condition === 'pct_from_high' && (
            <TextField
              label="Percent below 52-week high"
              size="small"
              type="number"
              value={draft.thresholdPercent}
              onChange={(e) => set({ thresholdPercent: e.target.value })}
              slotProps={{ htmlInput: { min: 0.1, max: 99, step: 0.5 } }}
              fullWidth
            />
          )}
          <TextField
            label="Note (optional)"
            size="small"
            value={draft.note}
            onChange={(e) => set({ note: e.target.value })}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || (draft.condition === 'cost_basis' && costBasis?.qty === 0)}
          sx={{ textTransform: 'none' }}
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create alert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
