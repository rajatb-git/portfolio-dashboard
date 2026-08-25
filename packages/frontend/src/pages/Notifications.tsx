import {
  Box,
  Chip,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { NotificationRecord } from '@/api/notifications';
import { Iconify } from '@/components/Iconify';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import StateView, { type ViewState } from '@/components/ui/StateView';
import ToolbarButton from '@/components/ui/ToolbarButton';

// Every source the dispatcher can record, with the label and tint the row uses.
const KINDS: Record<string, { label: string; color: string }> = {
  alert: { label: 'Price alert', color: '#3b82f6' },
  move: { label: 'Move', color: '#f59e0b' },
  spike: { label: 'Spike', color: '#ef4444' },
  news: { label: 'News', color: '#8b5cf6' },
  earnings: { label: 'Earnings', color: '#06b6d4' },
  earnings_result: { label: 'Earnings result', color: '#06b6d4' },
  dividend: { label: 'Dividend', color: '#22c55e' },
  ipo_reminder: { label: 'IPO reminder', color: '#ec4899' },
  ipo_announcement: { label: 'New IPO', color: '#ec4899' },
  summary: { label: 'Summary', color: '#64748b' },
  digest: { label: 'Digest', color: '#64748b' },
  test: { label: 'Test', color: '#64748b' },
};

const kindMeta = (kind: string) => KINDS[kind] ?? { label: kind, color: '#64748b' };

export default function Notifications() {
  const [state, setState] = React.useState<ViewState>('loading');
  const [error, setError] = React.useState('');
  const [items, setItems] = React.useState<NotificationRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [kind, setKind] = React.useState('');

  const load = React.useCallback(
    (quiet: boolean) => {
      if (!quiet) setState('loading');
      apis.notifications
        .getHistory(200, kind)
        .then((data) => {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
          setState((data.items ?? []).length === 0 ? 'empty' : 'ready');
        })
        .catch((err) => {
          setItems([]);
          setError(err.message || 'Failed to load notification history');
          setState('error');
          toast.error(err.message || 'Failed to load notification history');
        });
    },
    [kind]
  );

  React.useEffect(() => {
    load(false);
  }, [load]);

  const handleClear = async () => {
    try {
      const result = await apis.notifications.clearHistory();
      toast.success(`Cleared ${result.deleted} notification${result.deleted === 1 ? '' : 's'}`);
      load(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear notification history');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Everything the app has sent you, so you can tune thresholds against what actually fired"
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Select
              size="small"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              displayEmpty
              sx={{ minWidth: 170, fontSize: '0.8rem' }}
            >
              <MenuItem value="">All sources</MenuItem>
              {Object.keys(KINDS).map((key) => (
                <MenuItem key={key} value={key}>
                  {KINDS[key].label}
                </MenuItem>
              ))}
            </Select>
            <ToolbarButton icon="tabler:refresh" label="Refresh" onClick={() => load(true)} />
            <ToolbarButton icon="tabler:trash" label="Clear all" onClick={handleClear} />
          </Stack>
        }
      />

      <Panel
        title="History"
        subtitle={total > 0 ? `${total} record${total === 1 ? '' : 's'} kept for 30 days` : undefined}
        icon="tabler:bell-ringing"
        flush
      >
        {state !== 'ready' ? (
          <StateView
            state={state}
            message={error}
            title={state === 'empty' ? 'Nothing sent yet' : undefined}
            icon="tabler:bell-off"
            minHeight={220}
          />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: '0.7rem' }}>When</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Source</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Symbol</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Message</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => {
                  const meta = kindMeta(item.kind);
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {moment(item.createdAt).format('MMM D, HH:mm')}
                        <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                          {moment(item.createdAt).fromNow()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={meta.label}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: meta.color,
                            bgcolor: `${meta.color}1f`,
                            border: `1px solid ${meta.color}33`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{item.symbol || '—'}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', maxWidth: 460 }}>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{item.message}</Typography>
                      </TableCell>
                      <TableCell>
                        {item.suppressed ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Iconify icon="tabler:moon" width={14} sx={{ color: 'text.disabled' }} />
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>Quiet hours</Typography>
                          </Stack>
                        ) : item.delivered ? (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Iconify icon="tabler:check" width={14} sx={{ color: 'var(--pd-up)' }} />
                            <Typography sx={{ fontSize: '0.68rem', color: 'var(--pd-up)' }}>Sent</Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Iconify icon="tabler:alert-triangle" width={14} sx={{ color: 'var(--pd-down)' }} />
                            <Typography sx={{ fontSize: '0.68rem', color: 'var(--pd-down)' }}>Failed</Typography>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Panel>
    </Box>
  );
}
