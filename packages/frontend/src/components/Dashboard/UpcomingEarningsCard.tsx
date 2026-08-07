import { Box, Card, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';

import type { HoldingEarning } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';

type Props = {
  earnings: HoldingEarning[];
  isLoading: boolean;
};

function daysLabel(days: number): { label: string; color: string } {
  if (days <= 0) return { label: 'Today', color: 'var(--pd-down)' };
  if (days === 1) return { label: 'Tomorrow', color: 'var(--pd-warn)' };
  if (days <= 7) return { label: `${days}d`, color: 'var(--pd-warn)' };
  return { label: `${days}d`, color: '#64748b' };
}

export default function UpcomingEarningsCard({ earnings, isLoading }: Props) {
  const navigate = useNavigate();
  const upcoming = React.useMemo(() => earnings.slice(0, 8), [earnings]);

  if (!isLoading && earnings.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 1.25 }}>
        <Iconify icon="tabler:calendar-stats" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Upcoming Earnings
        </Typography>
      </Stack>
      <Divider />
      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={80} />
        </Box>
      ) : (
        <Stack divider={<Divider />}>
          {upcoming.map((e) => {
            const dl = daysLabel(e.daysAway);
            return (
              <Stack
                key={e.symbol}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
                onClick={() => navigate(`/research?searchText=${e.symbol}`)}
              >
                <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, minWidth: 56 }}>{e.symbol}</Typography>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    {e.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
                    {moment(e.date).format('ddd, MMM D, YYYY')}
                    {e.hour ? ` · ${e.hour === 'bmo' ? 'Before open' : e.hour === 'amc' ? 'After close' : e.hour}` : ''}
                    {e.epsEstimate != null ? ` · Est. EPS ${e.epsEstimate}` : ''}
                  </Typography>
                </Box>
                <Chip
                  label={dl.label}
                  size="small"
                  sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700, bgcolor: `${dl.color}22`, color: dl.color }}
                />
              </Stack>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
