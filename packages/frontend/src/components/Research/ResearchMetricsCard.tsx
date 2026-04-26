import { Box, Card, Divider, LinearProgress, Skeleton, Stack, Tooltip, Typography } from '@mui/material';

type Metrics = {
  week52High: number;
  week52Low: number;
  week52HighDate: string;
  week52LowDate: string;
  beta: number;
  peRatio: number;
  dividendYield: number;
  priceToBook: number;
  roeTTM: number;
  revenueGrowthTTMYoy: number;
  avgVolume10Day: number;
  shortInterest?: number;
  shortRatio?: number;
};

type Props = {
  metrics?: Metrics;
  currentPrice?: number;
  isLoading: boolean;
};

function MetricRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  const content = (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', py: 1, px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
    </Stack>
  );
  return tooltip ? <Tooltip title={tooltip} placement="left">{content}</Tooltip> : content;
}

export default function ResearchMetricsCard({ metrics, currentPrice, isLoading }: Props) {
  const rangePercent =
    metrics && currentPrice
      ? Math.max(0, Math.min(100, ((currentPrice - metrics.week52Low) / (metrics.week52High - metrics.week52Low)) * 100))
      : 0;

  return (
    <Card variant="outlined" sx={{ flexGrow: 1 }}>
      <Typography sx={{ p: '10px 16px', color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Key Statistics
      </Typography>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={220} sx={{ m: 2, borderRadius: 1 }} />
      ) : metrics ? (
        <Box>
          {/* 52-week range bar */}
          <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>52W Low ${metrics.week52Low.toFixed(2)}</Typography>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>52-Week Range</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>52W High ${metrics.week52High.toFixed(2)}</Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={rangePercent}
              sx={{
                height: 5,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6', borderRadius: 3 },
              }}
            />
          </Box>
          <Divider sx={{ opacity: 0.5 }} />

          <MetricRow label="P/E Ratio (TTM)" value={metrics.peRatio?.toFixed(2) ?? '—'} tooltip="Price-to-Earnings ratio (trailing 12 months)" />
          <MetricRow label="Beta" value={metrics.beta?.toFixed(3) ?? '—'} tooltip="Volatility relative to the S&P 500" />
          <MetricRow label="Dividend Yield" value={metrics.dividendYield ? `${metrics.dividendYield.toFixed(2)}%` : '—'} tooltip="Annual dividend as % of current price" />
          <MetricRow label="Price / Book" value={metrics.priceToBook?.toFixed(2) ?? '—'} tooltip="Price-to-book ratio (annual)" />
          <MetricRow label="ROE (TTM)" value={metrics.roeTTM ? `${metrics.roeTTM.toFixed(1)}%` : '—'} tooltip="Return on equity (trailing 12 months)" />
          <MetricRow label="Revenue Growth (YoY)" value={metrics.revenueGrowthTTMYoy ? `${metrics.revenueGrowthTTMYoy.toFixed(2)}%` : '—'} tooltip="TTM revenue growth vs prior year" />
          <MetricRow label="Avg Volume (10D)" value={metrics.avgVolume10Day ? `${metrics.avgVolume10Day.toFixed(2)}M` : '—'} tooltip="10-day average trading volume (millions)" />
          <MetricRow label="Short Interest" value={metrics.shortInterest ? `${metrics.shortInterest.toFixed(2)}M` : '—'} tooltip="Number of shares sold short (millions)" />
          <MetricRow label="Short Ratio (Days)" value={metrics.shortRatio?.toFixed(2) ?? '—'} tooltip="Days to cover short interest at average daily volume" />
        </Box>
      ) : null}
    </Card>
  );
}
