import React from 'react';

import { ApexOptions } from 'apexcharts';
import { Card, CardContent, Divider, Skeleton, Typography } from '@mui/material';

import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import { fnCurrency } from '@/utils/formatNumber';

const ReactApexChart = React.lazy(() => import('react-apexcharts'));

type Props = {
  monthlyHistory: Array<{ month: string; income: number }>;
  isLoading: boolean;
};

export default function DividendHistoryChart({ monthlyHistory, isLoading }: Props) {
  const { mode } = useThemeMode();

  const categories = monthlyHistory.map((m) => m.month);
  const data = monthlyHistory.map((m) => m.income);
  const hasData = data.some((v) => v > 0);

  const options: ApexOptions = {
    theme: { mode: mode as 'dark' | 'light' },
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false },
    },
    plotOptions: {
      bar: { borderRadius: 3, columnWidth: '60%' },
    },
    dataLabels: { enabled: false },
    colors: ['#22c55e'],
    xaxis: {
      categories,
      labels: {
        rotate: -45,
        style: { fontSize: '10px' },
      },
    },
    yaxis: {
      labels: { formatter: (val) => fnCurrency(val) },
    },
    tooltip: {
      y: { formatter: (val) => fnCurrency(val) },
    },
    grid: {
      show: true,
      borderColor: mode === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)',
    },
  };

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
        Monthly Dividend Income (Last 12 Months)
      </Typography>
      <Divider />

      <CardContent sx={{ pt: 1 }}>
        {isLoading ? (
          <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
        ) : !hasData ? (
          <Typography sx={{ py: 4, textAlign: 'center', color: 'text.disabled', fontSize: '0.82rem' }}>
            No dividend history available yet
          </Typography>
        ) : (
          <React.Suspense fallback={<Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />}>
            <ReactApexChart options={options} series={[{ name: 'Income', data }]} type="bar" height={220} />
          </React.Suspense>
        )}
      </CardContent>
    </Card>
  );
}
