import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import type { IAlert, IAlertStatus } from '@/models/AlertModel';
import { fnCurrency } from '@/utils/formatNumber';
import { notifyTriggeredAlerts } from '@/utils/priceAlertNotifications';

type DraftAlert = {
  id?: string;
  symbol: string;
  type: 'stock' | 'crypto';
  direction: 'above' | 'below';
  targetPrice: string;
  note: string;
};

const EMPTY_DRAFT: DraftAlert = { symbol: '', type: 'stock', direction: 'above', targetPrice: '', note: '' };

function AlertDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: DraftAlert;
  onClose: () => void;
  onSaved: () => void;
}) {
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

export default function Alerts() {
  const navigate = useNavigate();
  const [statuses, setStatuses] = React.useState<IAlertStatus[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DraftAlert>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = React.useState<IAlertStatus | null>(null);

  const load = React.useCallback((silent: boolean) => {
    if (!silent) setIsLoading(true);
    apis.alerts
      .getStatus()
      .then((data) => {
        setStatuses(data ?? []);
        notifyTriggeredAlerts(data ?? []);
      })
      .catch((err) => {
        if (!silent) toast.error(err.message || 'Failed to load alerts');
      })
      .finally(() => {
        if (!silent) setIsLoading(false);
      });
  }, []);

  React.useEffect(() => {
    load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const openCreate = () => {
    setEditing(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (a: IAlertStatus) => {
    setEditing({
      id: a.id,
      symbol: a.symbol,
      type: a.type,
      direction: a.direction,
      targetPrice: String(a.targetPrice),
      note: a.note ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apis.alerts.remove(deleteTarget.id);
      toast.success(`Alert for ${deleteTarget.symbol} deleted`);
      load(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete alert');
    } finally {
      setDeleteTarget(null);
    }
  };

  const triggeredCount = statuses.filter((s) => s.triggered).length;

  return (
    <Box sx={{ maxWidth: 920 }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 2.5, gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Alerts
        </Typography>
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => load(false)}>
            <Iconify icon="mingcute:refresh-3-fill" width={18} />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          size="small"
          startIcon={<Iconify icon="mdi:plus" width={16} />}
          onClick={openCreate}
          sx={{ textTransform: 'none' }}
        >
          New alert
        </Button>
      </Stack>

      <Card variant="outlined">
        <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
          <Iconify
            icon="tabler:bell-ringing"
            width={16}
            sx={{ color: triggeredCount > 0 ? '#f59e0b' : 'primary.main' }}
          />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              color: 'text.secondary',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Price Alerts
          </Typography>
          {triggeredCount > 0 && (
            <Chip
              label={`${triggeredCount} triggered`}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: 'rgba(245,158,11,0.15)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
              }}
            />
          )}
        </Stack>
        <Divider />

        {isLoading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rounded" height={120} />
          </Box>
        ) : statuses.length === 0 ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 5, px: 2 }}>
            <Iconify icon="tabler:bell-plus" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontSize: '0.85rem', color: 'text.disabled', textAlign: 'center', mb: 1.5 }}>
              No alerts yet. Create one to get notified when any stock or crypto reaches your target price.
            </Typography>
            <Button variant="outlined" size="small" onClick={openCreate} sx={{ textTransform: 'none' }}>
              Create your first alert
            </Button>
          </Stack>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Symbol', 'Current', 'Condition', 'Target', 'Status', ''].map((h) => (
                    <TableCell key={h} sx={{ fontSize: '0.68rem', color: 'text.disabled', fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {statuses.map((a) => (
                  <TableRow key={a.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => navigate(`/research?searchText=${a.symbol}`)}
                      >
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{a.symbol}</Typography>
                        <Chip
                          label={a.type}
                          size="small"
                          sx={{ height: 16, fontSize: '0.58rem', textTransform: 'uppercase' }}
                        />
                      </Stack>
                      {a.note && (
                        <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }} noWrap>
                          {a.note}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {a.currentPrice != null ? fnCurrency(a.currentPrice) : '—'}
                      {a.percentChange != null && (
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '0.68rem',
                            ml: 0.5,
                            color: a.percentChange >= 0 ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {a.percentChange >= 0 ? '+' : ''}
                          {a.percentChange}%
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {a.direction === 'above' ? '≥' : '≤'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{fnCurrency(a.targetPrice)}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.triggered ? 'Triggered' : 'Watching'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: a.triggered ? 'rgba(34,197,94,0.14)' : 'rgba(100,116,139,0.12)',
                          color: a.triggered ? '#22c55e' : 'text.secondary',
                          border: `1px solid ${a.triggered ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)'}`,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(a)} sx={{ color: 'text.disabled' }}>
                          <Iconify icon="mdi:pencil-outline" width={17} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget(a)}
                          sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                        >
                          <Iconify icon="mdi:delete-outline" width={17} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Card>

      <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', mt: 1.5 }}>
        Alerts are evaluated against live prices while the app is open. Enable desktop notifications under Settings →
        Dashboard to be alerted when a target is reached.
      </Typography>

      <AlertDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => load(true)}
      />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete alert</DialogTitle>
        <DialogContent>
          <Typography>
            Delete the alert for <strong>{deleteTarget?.symbol}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} sx={{ textTransform: 'none' }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
