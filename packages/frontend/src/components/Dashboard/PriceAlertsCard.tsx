import * as React from 'react';
import {
  Box,
  Card,
  Chip,
  Collapse,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import type { HoldingAggregate } from '@/api/dashboard';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

type AlertLevel = 'at_target' | 'near_target' | 'below';

type AlertRow = HoldingAggregate & { level: AlertLevel; gapPercent: number };

type Props = { holdings: HoldingAggregate[]; threshold?: number };

const LEVEL_CONFIG: Record<AlertLevel, { label: string; color: string; bg: string; border: string }> = {
  at_target: {
    label: 'At Target',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
  },
  near_target: {
    label: 'Near Target',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
  },
  below: {
    label: 'Below Target',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.10)',
    border: 'rgba(100,116,139,0.20)',
  },
};

export default function PriceAlertsCard({ holdings, threshold = 5 }: Props) {
  const alerts: AlertRow[] = holdings
    .filter((h) => h.targetPrice > 0)
    .map((h) => {
      const gapPercent = ((h.currentPrice - h.targetPrice) / h.targetPrice) * 100;
      let level: AlertLevel = 'below';
      if (h.currentPrice >= h.targetPrice) level = 'at_target';
      else if (h.currentPrice >= h.targetPrice * (1 - threshold / 100)) level = 'near_target';
      return { ...h, level, gapPercent };
    })
    .sort((a, b) => b.gapPercent - a.gapPercent);

  const activeAlerts = alerts.filter((a) => a.level !== 'below');
  const [open, setOpen] = React.useState(activeAlerts.length > 0);

  if (alerts.length === 0) return null;

  return (
    <Card variant="outlined">
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Iconify
            icon="tabler:bell-ringing"
            width={16}
            sx={{ color: activeAlerts.length > 0 ? '#f59e0b' : 'text.disabled' }}
          />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Price Alerts
          </Typography>
          {activeAlerts.length > 0 && (
            <Chip
              label={activeAlerts.length}
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
        <Iconify icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'} width={16} sx={{ color: 'text.disabled' }} />
      </Stack>

      <Collapse in={open}>
        <Divider />
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Symbol', 'Current', 'Target', 'Gap', 'Status'].map((h) => (
                  <TableCell key={h} sx={{ fontSize: '0.68rem', color: 'text.disabled', fontWeight: 700, py: 0.75 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((a) => {
                const cfg = LEVEL_CONFIG[a.level];
                return (
                  <TableRow key={`${a.symbol}-${a.accountId}`} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{a.symbol}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{fnCurrency(a.currentPrice)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{fnCurrency(a.targetPrice)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: a.gapPercent >= 0 ? '#22c55e' : 'text.secondary' }}>
                      {a.gapPercent >= 0 ? '+' : ''}
                      {a.gapPercent.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={cfg.label}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          bgcolor: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.border}`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Collapse>
    </Card>
  );
}
