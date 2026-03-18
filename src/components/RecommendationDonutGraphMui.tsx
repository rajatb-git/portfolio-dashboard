import * as React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { IRecommendation } from '@/models/RecommendationModel';
import { Box, Card, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

type Props = {
  recommendation?: IRecommendation;
  isLoading: boolean;
};

const valueFormatter = (item: { value: number }) => `${item.value}`;

const LABELS = ['Strong Buy', 'Buy', 'Hold', 'Sell', 'Strong Sell'];

export default function RecommendationDonutGraphMui({ recommendation, isLoading }: Props) {
  const theme = useTheme();

  const COLORS = [
    theme.palette.success.dark,
    theme.palette.success.main,
    theme.palette.primary.main,
    theme.palette.error.main,
    theme.palette.error.dark,
  ];

  const data = [
    { value: recommendation?.strongBuy || 0, label: 'Strong Buy' },
    { value: recommendation?.buy || 0, label: 'Buy' },
    { value: recommendation?.hold || 0, label: 'Hold' },
    { value: recommendation?.sell || 0, label: 'Sell' },
    { value: recommendation?.strongSell || 0, label: 'Strong Sell' },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card variant="outlined" sx={{ flexGrow: 1 }}>
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
        Analyst Recommendations
      </Typography>
      <Divider />

      {!isLoading ? (
        <Box sx={{ p: 1 }}>
          <PieChart
            height={190}
            colors={COLORS}
            series={[
              {
                data,
                innerRadius: 52,
                outerRadius: 80,
                arcLabel: (params) => (params.value > 0 ? `${params.value}` : ''),
                arcLabelMinAngle: 25,
                valueFormatter,
              },
            ]}
            skipAnimation={false}
            slots={{ legend: () => null }}
          />

          {/* Custom legend */}
          <Stack spacing={0.75} sx={{ px: 1.5, pb: 1.5 }}>
            {data.map((item, i) => (
              <Stack key={item.label} direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: COLORS[i],
                      flexShrink: 0,
                    }}
                  />
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    {LABELS[i]}
                  </Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary' }}>
                    {item.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', minWidth: 36, textAlign: 'right' }}>
                    {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '—'}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      ) : (
        <Skeleton variant="rectangular" height={260} sx={{ m: 2, borderRadius: 1 }} />
      )}
    </Card>
  );
}
