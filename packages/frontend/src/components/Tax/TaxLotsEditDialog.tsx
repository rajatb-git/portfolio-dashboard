import * as React from 'react';

import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import moment from 'moment';
import { toast } from 'react-toastify';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import type { ITaxLot } from '@/models/HoldingsModel';
import { fnCurrency } from '@/utils/formatNumber';

type DraftLot = { id: string; qty: string; price: string; date: string; estimated?: boolean };

type Props = {
  open: boolean;
  holdingId: string;
  symbol: string;
  accountName: string;
  lots: ITaxLot[];
  onClose: () => void;
  onSaved: () => void;
};

const toDraft = (lots: ITaxLot[]): DraftLot[] =>
  lots.map((l) => ({
    id: l.id,
    qty: String(l.qty),
    price: String(+l.price.toFixed(4)),
    date: moment(l.date).format('YYYY-MM-DD'),
    ...(l.estimated && { estimated: true }),
  }));

const rowError = (lot: DraftLot): string => {
  const qty = Number(lot.qty);
  if (lot.qty.trim() === '' || !Number.isFinite(qty) || qty <= 0) return 'Quantity must be a positive number';
  const price = Number(lot.price);
  if (lot.price.trim() === '' || !Number.isFinite(price) || price < 0) return 'Cost must be zero or more';
  const date = moment(lot.date, 'YYYY-MM-DD', true);
  if (!date.isValid()) return 'Enter a valid date';
  if (date.isAfter(moment(), 'day')) return 'Date cannot be in the future';
  return '';
};

export default function TaxLotsEditDialog({ open, holdingId, symbol, accountName, lots, onClose, onSaved }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [saved, setSaved] = React.useState<DraftLot[]>(() => toDraft(lots));
  const [draft, setDraft] = React.useState<DraftLot[]>(() => toDraft(lots));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSaved(toDraft(lots));
    setDraft(toDraft(lots));
  }, [open]);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const errors = draft.map(rowError);
  const isValid = draft.length > 0 && errors.every((e) => !e);

  const totals = (rows: DraftLot[]) => {
    const qty = rows.reduce((s, r) => s + (Number(r.qty) || 0), 0);
    const cost = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
    return { qty: +qty.toFixed(8), averagePrice: qty ? cost / qty : 0 };
  };
  const before = totals(saved);
  const after = totals(draft);

  // Touching a row means the user has reviewed it, so it no longer counts as estimated.
  const updateRow = (id: string, patch: Partial<DraftLot>) =>
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch, estimated: undefined } : r)));

  const addRow = () =>
    setDraft((rows) => [...rows, { id: crypto.randomUUID(), qty: '', price: '', date: moment().format('YYYY-MM-DD') }]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await apis.holdings.updateLots(
        holdingId,
        draft.map((r) => ({
          id: r.id,
          qty: Number(r.qty),
          price: Number(r.price),
          date: r.date,
          estimated: r.estimated,
        }))
      );
      const next = toDraft(result.lots ?? []);
      setSaved(next);
      setDraft(next);
      toast.success(`${symbol} tax lots saved`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tax lots');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        Tax lots · {symbol}
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{accountName}</Typography>
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', mb: 1.5 }}>
          One row per purchase. The position's quantity and average cost follow these lots — no trade is recorded and
          cash is not touched.
        </Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Purchase date', 'Quantity', 'Cost / share', 'Cost basis', ''].map((h) => (
                  <TableCell key={h} sx={{ fontSize: '0.68rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {draft.map((lot, i) => (
                <TableRow key={lot.id}>
                  <TableCell sx={{ minWidth: 170 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <TextField
                        type="date"
                        size="small"
                        value={lot.date}
                        onChange={(e) => updateRow(lot.id, { date: e.target.value })}
                        disabled={saving}
                        slotProps={{ htmlInput: { max: moment().format('YYYY-MM-DD') } }}
                      />
                      {lot.estimated && (
                        <Chip
                          label="Estimated"
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'var(--pd-warn-bg)', color: 'var(--pd-warn)' }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 110 }}>
                    <TextField
                      size="small"
                      value={lot.qty}
                      onChange={(e) => updateRow(lot.id, { qty: e.target.value })}
                      disabled={saving}
                      error={!!lot.qty && !!errors[i] && errors[i].startsWith('Quantity')}
                    />
                  </TableCell>
                  <TableCell sx={{ minWidth: 110 }}>
                    <TextField
                      size="small"
                      value={lot.price}
                      onChange={(e) => updateRow(lot.id, { price: e.target.value })}
                      disabled={saving}
                      error={!!lot.price && !!errors[i] && errors[i].startsWith('Cost')}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {fnCurrency((Number(lot.qty) || 0) * (Number(lot.price) || 0))}
                  </TableCell>
                  <TableCell padding="checkbox">
                    <IconButton
                      size="small"
                      aria-label="Remove lot"
                      onClick={() => setDraft((rows) => rows.filter((r) => r.id !== lot.id))}
                      disabled={saving || draft.length === 1}
                    >
                      <Iconify icon="mdi:trash-can-outline" width={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Button
          size="small"
          onClick={addRow}
          disabled={saving}
          startIcon={<Iconify icon="mdi:plus" width={14} />}
          sx={{ mt: 1 }}
        >
          Add lot
        </Button>

        {errors.find((e) => e) && isDirty && (
          <Typography sx={{ fontSize: '0.75rem', color: 'error.main', mt: 1 }}>
            Lot {errors.findIndex((e) => e) + 1}: {errors.find((e) => e)}
          </Typography>
        )}

        <Stack direction="row" spacing={3} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
              Quantity
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {after.qty.toLocaleString()}
              {after.qty !== before.qty && (
                <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.disabled', ml: 0.75 }}>
                  was {before.qty.toLocaleString()}
                </Typography>
              )}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
              Average cost
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {fnCurrency(after.averagePrice)}
              {Math.abs(after.averagePrice - before.averagePrice) >= 0.005 && (
                <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.disabled', ml: 0.75 }}>
                  was {fnCurrency(before.averagePrice)}
                </Typography>
              )}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {isDirty && (
          <Typography sx={{ fontSize: '0.75rem', color: 'var(--pd-warn)', mr: 'auto' }}>Unsaved changes</Typography>
        )}
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Close
        </Button>
        <Button onClick={() => setDraft(saved)} disabled={!isDirty || saving}>
          Reset
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!isDirty || !isValid || saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
