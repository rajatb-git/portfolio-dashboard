import React from 'react';

import { ToggleButtonGroup, ToggleButton, Card, CardContent } from '@mui/material';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

import apis from '@/api';
import { Range } from '@/api/live';
import { THEME_MODE } from '@/config';

import theme from './ThemeRegistry/theme';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  symbol: string;
  price: number;
};

const RangeOptions = ['1d', '5d', '1M', '3M', '6M', '1y', '2y', '3y'];

export const PriceHistoryGraph = ({ symbol, price }: Props) => {
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
      mode: THEME_MODE,
    },
    chart: {
      type: 'candlestick',
      background: 'transparent',
      toolbar: {
        offsetY: -36,
        tools: {
          reset: `<img src="/images/icons/tabler--zoom-reset-${THEME_MODE === 'dark' ? 'white' : 'black'}.png" width="20">`,
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
        fontSize: '12px',
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
    // annotations: {
    //   yaxis: [
    //     {
    //       y: price,
    //       label: {
    //         style: {
    //           fontSize: '10px',
    //         },
    //         orientation: 'horizontal',
    //         text: fnCurrency(price),
    //       },
    //     },
    //   ],
    // },
  };

  const handleRangeChange = (event: React.MouseEvent<HTMLElement>, newRange: Range) => {
    setRange(newRange);
  };

  React.useEffect(() => {
    loadData();
  }, [symbol, range]);

  return (
    <Card sx={{ my: 2 }}>
      <CardContent>
        <ToggleButtonGroup
          color="primary"
          size="small"
          value={range}
          exclusive
          onChange={handleRangeChange}
          aria-label="Range"
          sx={{ ml: 2, backgroundColor: theme.palette.background.paper }}
        >
          {RangeOptions.map((option) => (
            <ToggleButton
              key={option}
              value={option}
              sx={{
                px: 1.5,
                border: 'none !important',
              }}
            >
              {option}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {series && <ReactApexChart options={options} series={series} type="candlestick" height={450} width="100%" />}
      </CardContent>
    </Card>
  );
};
