import { Box, Card, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import type { HoldingEarningResult } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';

type Props = {
  results: HoldingEarningResult[];
  isLoading: boolean;
};

function formatEps(v: number | null): string {
  return v == null ? '—' : `$${v.toFixed(2)}`;
}

function formatRevenue(v: number | null): string {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v}`;
}

function whenLabel(daysAgo: number): string {
  if (daysAgo <= 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo}d ago`;
}

export default function ReportedEarningsCard({ results, isLoading }: Props) {
  const navigate = useNavigate();
  const reported = React.useMemo(() => results.slice(0, 8), [results]);

  if (!isLoading && results.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 1.25 }}>
        <Iconify icon="tabler:report-money" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Recently Reported
        </Typography>
      </Stack>
      <Divider />
      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={80} />
        </Box>
      ) : (
        <Stack divider={<Divider />}>
          {reported.map((r) => {
            const beat = r.epsActual != null && r.epsEstimate != null && r.epsActual >= r.epsEstimate;
            const color = r.epsEstimate == null ? '#64748b' : beat ? 'var(--pd-up)' : 'var(--pd-down)';
            const verdict = r.epsEstimate == null ? 'Reported' : beat ? 'Beat' : 'Miss';
            return (
              <Stack
                key={`${r.symbol}-${r.date}`}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => navigate(`/research?searchText=${r.symbol}`)}
              >
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 56 }}>{r.symbol}</Typography>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    EPS {formatEps(r.epsActual)}
                    {r.epsEstimate != null ? ` vs ${formatEps(r.epsEstimate)} est.` : ''}
                    {r.revenueActual != null ? ` · Rev ${formatRevenue(r.revenueActual)}` : ''}
                    {r.revenueActual != null && r.revenueEstimate != null
                      ? ` vs ${formatRevenue(r.revenueEstimate)} est.`
                      : ''}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                    {r.name} · {moment(r.date).format('ddd, MMM D, YYYY')} · {whenLabel(r.daysAgo)}
                  </Typography>
                </Box>
                <Chip
                  label={
                    r.surprisePercent != null
                      ? `${verdict} ${r.surprisePercent >= 0 ? '+' : ''}${r.surprisePercent.toFixed(1)}%`
                      : verdict
                  }
                  size="small"
                  sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700, bgcolor: `${color}22`, color }}
                />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
