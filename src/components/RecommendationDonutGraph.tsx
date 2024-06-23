import { Card, CardContent, Skeleton } from '@mui/material';
import { ApexOptions } from 'apexcharts';
import dynamic from 'next/dynamic';

import { IRecommendation } from '@/models/RecommendationModel';

import theme from './ThemeRegistry/theme';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Props = {
  recommendation: IRecommendation;
  isLoading: boolean;
};

export const RecommendationDonutGraph = ({ recommendation, isLoading }: Props) => {
  const options: ApexOptions = {
    chart: {
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350,
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: any, opts: any) {
        return opts.w.config?.series?.[opts.seriesIndex];
      },
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      itemMargin: {
        horizontal: 2,
        vertical: 2,
      },
      labels: {
        colors: theme.palette.text.primary,
      },
      markers: {
        radius: 2,
      },
    },
    colors: [
      theme.palette.success.dark,
      theme.palette.success.main,
      theme.palette.primary.main,
      theme.palette.error.main,
      theme.palette.error.dark,
    ],
    noData: { text: 'No data available' },
    stroke: {
      show: true,
      curve: 'smooth',
      lineCap: 'round',
      width: 0.25,
      dashArray: 0,
    },
    labels: ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'],
    plotOptions: {
      pie: {
        donut: {
          size: '50%',
        },
      },
    },
  };

  return isLoading ? (
    <Skeleton variant="rounded" height={150} sx={{ my: 2 }} />
  ) : (
    <Card>
      <CardContent>
        {recommendation.strongBuy && (
          <ReactApexChart
            options={options}
            series={[
              recommendation?.strongBuy || 0,
              recommendation?.buy || 0,
              recommendation?.hold || 0,
              recommendation?.sell || 0,
              recommendation?.strongSell || 0,
            ]}
            type="donut"
            width={250}
            height={250}
          />
        )}
      </CardContent>
    </Card>
  );
};
