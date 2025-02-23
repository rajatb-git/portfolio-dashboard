import * as React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { IRecommendation } from '@/models/RecommendationModel';
import { Card, CardContent, Skeleton } from '@mui/material';
import theme from './ThemeRegistry/theme';

type Props = {
  recommendation?: IRecommendation;
  isLoading: boolean;
};

const valueFormatter = (item: { value: number }) => `${item.value}`;

export default function RecommendationDonutGraphMui({ recommendation, isLoading }: Props) {
  return (
    <Card variant="outlined" sx={{ height: 230, flexGrow: 1 }}>
      {!isLoading ? (
        <CardContent>
          <PieChart
            height={200}
            colors={[
              theme.palette.success.dark,
              theme.palette.success.main,
              theme.palette.primary.main,
              theme.palette.error.main,
              theme.palette.error.dark,
            ]}
            series={[
              {
                data: [
                  { value: recommendation?.strongBuy || 0, label: 'Strong Buy' },
                  { value: recommendation?.buy || 0, label: 'Buy' },
                  { value: recommendation?.hold || 0, label: 'Hold' },
                  { value: recommendation?.sell || 0, label: 'Sell' },
                  { value: recommendation?.strongSell || 0, label: 'Strong Sell' },
                ],
                innerRadius: 50,
                arcLabel: (params) => params.label ?? '',
                arcLabelMinAngle: 20,
                valueFormatter,
              },
            ]}
            skipAnimation={false}
          />
        </CardContent>
      ) : (
        <Skeleton variant="rectangular" height={200} />
      )}
    </Card>
  );
}
