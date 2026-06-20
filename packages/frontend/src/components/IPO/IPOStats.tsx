import React from 'react';

import { Card, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material';
import moment from 'moment';

import { IIPO } from '@/models/IPOModel';
import { fnShortenCurrency } from '@/utils/formatNumber';

type Props = { ipos: Array<IIPO>; isLoading: boolean };

function MetricItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack spacing={0.25}>
      <Typography
        sx={{
          fontSize: '0.68rem',
          color: 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
    </Stack>
  );
}

export default function IPOStats({ ipos, isLoading }: Props) {
  const stats = React.useMemo(() => {
    const today = moment().startOf('day');
    const startWeek = moment().startOf('isoWeek');
    const endWeek = moment().endOf('isoWeek');

    const upcoming = ipos.filter((x) => moment(x.date).isSameOrAfter(today));
    const expectedRaise = upcoming.reduce((sum, x) => sum + (x.totalSharesValue || 0), 0);
    const pricedThisWeek = ipos.filter(
      (x) => x.status === 'priced' && moment(x.date).isBetween(startWeek, endWeek, undefined, '[]')
    ).length;
    const withdrawn = ipos.filter((x) => x.status === 'withdrawn').length;

    return { total: ipos.length, upcoming: upcoming.length, expectedRaise, pricedThisWeek, withdrawn };
  }, [ipos]);

  return (
    <Card variant="outlined">
      <Typography
        sx={{
          p: '10px 16px',
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Overview
      </Typography>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={64} sx={{ m: 2, borderRadius: 1 }} />
      ) : (
        <Grid container spacing={2.5} sx={{ p: 2 }}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <MetricItem label="Total IPOs" value={`${stats.total}`} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <MetricItem label="Upcoming" value={`${stats.upcoming}`} color="#3b82f6" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <MetricItem label="Expected Raise" value={fnShortenCurrency(stats.expectedRaise)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <MetricItem label="Priced This Week" value={`${stats.pricedThisWeek}`} color="#22c55e" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <MetricItem label="Withdrawn" value={`${stats.withdrawn}`} color={stats.withdrawn > 0 ? '#ef4444' : undefined} />
          </Grid>
        </Grid>
      )}
    </Card>
  );
}
