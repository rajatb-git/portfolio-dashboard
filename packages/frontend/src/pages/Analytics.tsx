import * as React from 'react';

import { Grid, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { HoldingAggregate, PortfolioSnapshot } from '@/api/dashboard';
import type { RiskMetrics, SectorAllocation } from '@/api/analytics';
import AllocationCharts from '@/components/Analytics/AllocationCharts';
import NewsSentimentCard from '@/components/Analytics/NewsSentimentCard';
import PerformanceAttributionCard from '@/components/Analytics/PerformanceAttributionCard';
import PortfolioPerformanceChart from '@/components/Analytics/PortfolioPerformanceChart';
import RiskMetricsCard from '@/components/Analytics/RiskMetricsCard';
import SectorAllocationChart from '@/components/Analytics/SectorAllocationChart';

export default function Analytics() {
  const [snapshots, setSnapshots] = React.useState<PortfolioSnapshot[]>([]);
  const [dashboardData, setDashboardData] = React.useState<HoldingAggregate[]>([]);
  const [riskMetrics, setRiskMetrics] = React.useState<RiskMetrics | null>(null);
  const [sectors, setSectors] = React.useState<SectorAllocation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRiskLoading, setIsRiskLoading] = React.useState(true);

  const [attribution, setAttribution] = React.useState<any>(null);
  const [isAttributionLoading, setIsAttributionLoading] = React.useState(true);

  const [sentiment, setSentiment] = React.useState<any>(null);
  const [isSentimentLoading, setIsSentimentLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apis.dashboard.getSnapshots().catch((err) => {
        toast.error(err.message || 'Failed to load portfolio snapshots');
        return [] as PortfolioSnapshot[];
      }),
      apis.dashboard.getDashboard().catch((err) => {
        toast.error(err.message || 'Failed to load dashboard data');
        return [] as HoldingAggregate[];
      }),
    ])
      .then(([snaps, data]) => {
        setSnapshots(snaps ?? []);
        setDashboardData(data ?? []);
      })
      .finally(() => setIsLoading(false));

    setIsRiskLoading(true);
    Promise.all([
      apis.analytics.getRiskMetrics().catch((err) => {
        toast.error(err.message || 'Failed to load risk metrics');
        return null;
      }),
      apis.analytics.getSectorAllocation().catch((err) => {
        toast.error(err.message || 'Failed to load sector allocation');
        return [] as SectorAllocation[];
      }),
    ])
      .then(([risk, sectorData]) => {
        setRiskMetrics(risk);
        setSectors(sectorData ?? []);
      })
      .finally(() => setIsRiskLoading(false));

    setIsAttributionLoading(true);
    apis.analytics
      .getPerformanceAttribution()
      .then((data) => setAttribution(data))
      .catch((err) => toast.error(err.message || 'Failed to load performance attribution'))
      .finally(() => setIsAttributionLoading(false));

    setIsSentimentLoading(true);
    apis.live
      .getPortfolioSentiment()
      .then((data) => setSentiment(data))
      .catch((err) => toast.error(err.message || 'Failed to load news sentiment'))
      .finally(() => setIsSentimentLoading(false));

  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Analytics
      </Typography>

      <PortfolioPerformanceChart snapshots={snapshots} />

      <RiskMetricsCard metrics={riskMetrics} isLoading={isRiskLoading} />

      <PerformanceAttributionCard attribution={attribution} isLoading={isAttributionLoading} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <NewsSentimentCard sentiment={sentiment} isLoading={isSentimentLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectorAllocationChart sectors={sectors} isLoading={isRiskLoading} />
        </Grid>
      </Grid>

      <AllocationCharts dashboardData={dashboardData} isLoading={isLoading} />
    </Stack>
  );
}
