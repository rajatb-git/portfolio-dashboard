import { Card, CardContent, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { ApexOptions } from 'apexcharts';
import React from 'react';

import apis from '@/api';
import type { Range } from '@/api/live';
import { useThemeMode } from './ThemeRegistry/ThemeModeContext';

const ReactApexChart = React.lazy(() => import('react-apexcharts'));

type Props = {
  symbol: string;
};

const RangeOptions = ['1d', '5d', '1M', '3M', '6M', '1y', '2y', '3y'];

export const PriceHistoryGraph = ({ symbol }: Props) => {
  const { mode } = useThemeMode();
  const theme = useTheme();
  const [series, setSeries] = React.useState<any>();
  const [range, setRange] = React.useState<Range>('6M');

  const loadData = async () => {
    await apis.live.getPriceHistory(symbol, range).then((data) => {
      setSeries([
        {
          name: 'Price',
          data,
        },
      ]);
    });
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
    },
    tooltip: {
      x: {
        format: 'dd MMM yyyy',
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

  const handleRangeChange = (_event: React.MouseEvent<HTMLElement>, newRange: Range) => {
    setRange(newRange);
  };

  React.useEffect(() => {
    loadData();
  }, [symbol, range]);

  return (
    <Card variant="outlined" sx={{ minWidth: 400 }}>
      <CardContent>
        <ToggleButtonGroup size="small" value={range} exclusive onChange={handleRangeChange} aria-label="Range">
          {RangeOptions.map((option) => (
            <ToggleButton key={option} value={option}>
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {series && (
          <React.Suspense fallback={<div>Loading chart...</div>}>
            <ReactApexChart options={options} series={series} type="candlestick" height={450} width="100%" />
          </React.Suspense>
        )}
      </CardContent>
    </Card>
  );
};
