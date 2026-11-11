import { Box, Card, CardContent, Skeleton, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ApexOptions } from 'apexcharts';
import React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import type { Range } from '@/api/live';
import { useThemeMode } from './ThemeRegistry/ThemeModeContext';

const ReactApexChart = React.lazy(() => import('react-apexcharts'));

type Props = {
  symbol: string;
};

const RangeOptions = ['1d', '5d', '1M', '3M', '6M', '1y', '2y', '3y'];

export const PriceHistoryGraph = ({ symbol }: Props) => {
  const { resolvedMode: mode } = useThemeMode();
  const theme = useTheme();
  const [series, setSeries] = React.useState<any>();
  const [range, setRange] = React.useState<Range>('6M');
  const [isLoading, setIsLoading] = React.useState(false);

  const loadData = async () => {
    if (!symbol) return;
    setIsLoading(true);
    await apis.live
      .getPriceHistory(symbol, range)
      .then((data) => {
        setSeries([
          {
            name: 'Price',
            data,
          },
        ]);
      })
      .catch((err) => {
        setSeries(undefined);
        toast.error(err.message || 'Failed to load price history');
      })
      .finally(() => setIsLoading(false));
  };

  const options: ApexOptions = {
    theme: {
      mode: mode as 'dark' | 'light',
    },
    chart: {
      type: 'candlestick',
      background: 'transparent',
      toolbar: {
        offsetY: -36,
        tools: {
          reset: `<img src="/images/icons/tabler--zoom-reset-${mode === 'dark' ? 'white' : 'black'}.png" width="20">`,
        },
      },
    },
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false },
    },
    tooltip: {
      x: {
        format: range === '1d' ? 'h:mm TT' : 'dd MMM yyyy',
      },
      style: {
        fontSize: '1rem',
      },
      fillSeriesColor: false,
      fixed: {
        enabled: true,
        position: 'topRight',
        offsetX: 0,
        offsetY: 0,
      },
    },
    yaxis: {
      opposite: true,
      tooltip: {
        enabled: true,
      },
    },
    grid: {
      show: true,
      borderColor: theme.palette.divider,
    },
    dataLabels: {
      enabled: false,
    },
  };

  const handleRangeChange = (_event: React.MouseEvent<HTMLElement>, newRange: Range | null) => {
    if (newRange) setRange(newRange);
  };

  React.useEffect(() => {
    loadData();
  }, [symbol, range]);

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <CardContent>
        <ToggleButtonGroup size="small" value={range} exclusive onChange={handleRangeChange} aria-label="Range">
          {RangeOptions.map((option) => (
            <ToggleButton key={option} value={option}>
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {!series && isLoading && <Skeleton variant="rounded" height={450} sx={{ mt: 1 }} />}
        {series && (
          <Box sx={{ opacity: isLoading ? 0.45 : 1, transition: 'opacity 150ms' }} aria-busy={isLoading}>
            <React.Suspense fallback={<Skeleton variant="rounded" height={450} sx={{ mt: 1 }} />}>
              <ReactApexChart options={options} series={series} type="candlestick" height={450} width="100%" />
            </React.Suspense>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
