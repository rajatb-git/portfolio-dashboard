import * as React from 'react';

import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Card, Divider, Grid, Skeleton, Stack, Typography } from '@mui/material';

import { HoldingAggregate } from '@/api/dashboard';
import { fnCurrency } from '@/utils/formatNumber';

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#84cc16',
  '#14b8a6',
];

type DonutData = { label: string; value: number };

function AllocationDonut({
  title,
  data,
  isLoading,
}: {
  title: string;
  data: DonutData[];
  isLoading: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
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
        {title}
      </Typography>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={240} sx={{ m: 2, borderRadius: 1 }} />
      ) : data.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.disabled', fontSize: '0.82rem' }}>
            No data available
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 1 }}>
          <PieChart
            height={180}
            colors={COLORS}
            series={[
              {
                data: data.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] })),
                innerRadius: 46,
                outerRadius: 74,
                arcLabel: (params) =>
                  params.value / total > 0.08
                    ? `${Math.round((params.value / total) * 100)}%`
                    : '',
                arcLabelMinAngle: 20,
                valueFormatter: (item) => fnCurrency(item.value),
              },
            ]}
            skipAnimation={false}
            slots={{ legend: () => null }}
          />

          {/* Custom legend */}
          <Stack spacing={0.5} sx={{ px: 1.5, pb: 1.5 }}>
            {data.map((item, i) => (
              <Stack
                key={item.label}
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: COLORS[i % COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {item.label}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.primary' }}>
                    {fnCurrency(item.value)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: 'text.disabled',
                      minWidth: 34,
                      textAlign: 'right',
                    }}
                  >
                    {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '—'}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Card>
  );
}

type Props = {
  dashboardData: HoldingAggregate[];
  isLoading: boolean;
};

export default function AllocationCharts({ dashboardData, isLoading }: Props) {
  // Group by asset type
  const byType: Record<string, number> = {};
  for (const h of dashboardData) {
    const label = h.type === 'crypto' ? 'Crypto' : 'Stocks';
    byType[label] = (byType[label] ?? 0) + h.marketValue;
  }
  const typeData: DonutData[] = Object.entries(byType)
    .map(([label, value]) => ({ label, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  // Group by account
  const byAccount: Record<string, number> = {};
  for (const h of dashboardData) {
    byAccount[h.accountId] = (byAccount[h.accountId] ?? 0) + h.marketValue;
  }
  const accountData: DonutData[] = Object.entries(byAccount)
    .map(([label, value]) => ({ label, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <AllocationDonut title="By Asset Type" data={typeData} isLoading={isLoading} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <AllocationDonut title="By Account" data={accountData} isLoading={isLoading} />
      </Grid>
    </Grid>
  );
}
