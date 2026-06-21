import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { IAlert } from '@/models/AlertModel';

export type DraftAlert = {
  id?: string;
  symbol: string;
  type: 'stock' | 'crypto';
  direction: 'above' | 'below';
  targetPrice: string;
  note: string;
};

export const EMPTY_DRAFT: DraftAlert = { symbol: '', type: 'stock', direction: 'above', targetPrice: '', note: '' };

type Props = {
  open: boolean;
  initial: DraftAlert;
  onClose: () => void;
  onSaved: () => void;
};

export default function AlertDialog({ open, initial, onClose, onSaved }: Props) {
  const [draft, setDraft] = React.useState<DraftAlert>(initial);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const isEdit = !!initial.id;

  const set = (partial: Partial<DraftAlert>) => setDraft((d) => ({ ...d, ...partial }));

  const handleSave = async () => {
    const symbol = draft.symbol.trim().toUpperCase();
    const targetPrice = parseFloat(draft.targetPrice);
    if (!symbol) {
      toast.error('Symbol is required');
      return;
    }
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      toast.error('Enter a target price greater than 0');
      return;
    }
    const payload: IAlert = {
      symbol,
      type: draft.type,
      direction: draft.direction,
      targetPrice,
      ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
    };
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
              label="Trigger when price"
              size="small"
              value={draft.direction}
              onChange={(e) => set({ direction: e.target.value as DraftAlert['direction'] })}
              fullWidth
            >
              <MenuItem value="above">Rises to / above</MenuItem>
              <MenuItem value="below">Falls to / below</MenuItem>
            </TextField>
          </Stack>
          <TextField
            label="Target price"
            size="small"
            type="number"
            value={draft.targetPrice}
            onChange={(e) => set({ targetPrice: e.target.value })}
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            fullWidth
          />
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
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Create alert'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
