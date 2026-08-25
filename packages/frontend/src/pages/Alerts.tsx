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
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import AlertDialog, { type DraftAlert, EMPTY_DRAFT } from '@/components/Alerts/AlertDialog';
import { Iconify } from '@/components/Iconify';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';
import { ALERT_CONDITION_LABELS, type IAlertStatus } from '@/models/AlertModel';
import { fnCurrency } from '@/utils/formatNumber';
import { notifyTriggeredAlerts } from '@/utils/priceAlertNotifications';

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
      condition: a.condition ?? 'price',
      direction: a.direction,
      targetPrice: String(a.targetPrice),
      trailPercent: String(a.trailPercent ?? 10),
      thresholdPercent: String(a.thresholdPercent ?? 20),
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
      <PageHeader
        title="Alerts"
        subtitle={
          triggeredCount > 0
            ? `${triggeredCount} alert${triggeredCount === 1 ? '' : 's'} triggered`
            : 'Price triggers on the symbols you follow'
        }
        actions={
          <>
            <ToolbarButton icon="tabler:refresh" label="Refresh alerts" onClick={() => load(false)} busy={isLoading} />
            <Button
              variant="contained"
              size="small"
              startIcon={<Iconify icon="tabler:plus" width={16} aria-hidden />}
              onClick={openCreate}
            >
              New alert
            </Button>
          </>
        }
      />

      <Card variant="outlined">
        <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
          <Iconify
            icon="tabler:bell-ringing"
            width={16}
            sx={{ color: triggeredCount > 0 ? 'var(--pd-warn)' : 'primary.main' }}
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
                bgcolor: 'var(--pd-warn-bg)',
                color: 'var(--pd-warn)',
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
                            color: a.percentChange >= 0 ? 'var(--pd-up)' : 'var(--pd-down)',
                          }}
                        >
                          {a.percentChange >= 0 ? '+' : ''}
                          {a.percentChange}%
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {a.condition === 'trailing_stop' || a.condition === 'pct_from_high'
                        ? '≤'
                        : a.direction === 'above'
                          ? '≥'
                          : '≤'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {a.resolvedTarget != null ? fnCurrency(a.resolvedTarget) : '—'}
                      {a.condition && a.condition !== 'price' && (
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }} noWrap>
                          {ALERT_CONDITION_LABELS[a.condition]}
                          {a.condition === 'trailing_stop' && a.trailPercent ? ` · ${a.trailPercent}%` : ''}
                          {a.condition === 'pct_from_high' && a.thresholdPercent ? ` · ${a.thresholdPercent}%` : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.triggered ? 'Triggered' : 'Watching'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          bgcolor: a.triggered ? 'var(--pd-up-bg)' : 'rgba(100,116,139,0.12)',
                          color: a.triggered ? 'var(--pd-up)' : 'text.secondary',
                          border: `1px solid ${a.triggered ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.2)'}`,
                        }}
                      />
                      {a.triggeredAt && (
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', mt: 0.25 }}>
                          {moment(a.triggeredAt).fromNow()}
                        </Typography>
                      )}
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
        A background service checks these alerts on the server — stock alerts during US market hours (excluding
        holidays), crypto 24/7 — so triggers are recorded even when this page is closed. Enable desktop notifications
        under Settings → Dashboard to also be alerted in your browser, and tune the check frequency under Settings →
        Price Alert Monitor.
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
