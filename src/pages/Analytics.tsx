import * as React from 'react';

import { Grid, Stack, Typography } from '@mui/material';

import apis from '@/api';
import { HoldingAggregate, PortfolioSnapshot } from '@/api/dashboard';
import { RiskMetrics, SectorAllocation } from '@/api/analytics';
import { DividendSummary } from '@/api/dividends';
import AllocationCharts from '@/components/Analytics/AllocationCharts';
import PortfolioPerformanceChart from '@/components/Analytics/PortfolioPerformanceChart';
import RiskMetricsCard from '@/components/Analytics/RiskMetricsCard';
import SectorAllocationChart from '@/components/Analytics/SectorAllocationChart';
import DividendIncomeCard from '@/components/Analytics/DividendIncomeCard';
import DividendHistoryChart from '@/components/Analytics/DividendHistoryChart';
import DividendByHoldingTable from '@/components/Analytics/DividendByHoldingTable';

export default function Analytics() {
  const [snapshots, setSnapshots] = React.useState<PortfolioSnapshot[]>([]);
  const [dashboardData, setDashboardData] = React.useState<HoldingAggregate[]>([]);
  const [riskMetrics, setRiskMetrics] = React.useState<RiskMetrics | null>(null);
  const [sectors, setSectors] = React.useState<SectorAllocation[]>([]);
  const [dividendSummary, setDividendSummary] = React.useState<DividendSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRiskLoading, setIsRiskLoading] = React.useState(true);
  const [isDividendLoading, setIsDividendLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([
      apis.dashboard.getSnapshots().catch(() => [] as PortfolioSnapshot[]),
      apis.dashboard.getDashboard().catch(() => [] as HoldingAggregate[]),
    ])
      .then(([snaps, data]) => {
        setSnapshots(snaps ?? []);
        setDashboardData(data ?? []);
      })
      .finally(() => setIsLoading(false));

    // Fetch risk metrics and sector allocation
    setIsRiskLoading(true);
    Promise.all([
      apis.analytics.getRiskMetrics().catch(() => null),
      apis.analytics.getSectorAllocation().catch(() => [] as SectorAllocation[]),
    ])
      .then(([risk, sectorData]) => {
        setRiskMetrics(risk);
        setSectors(sectorData ?? []);
      })
      .finally(() => setIsRiskLoading(false));

    // Fetch dividend summary
    setIsDividendLoading(true);
    apis.dividends
      .getSummary()
      .then((summary) => setDividendSummary(summary))
      .catch(() => setDividendSummary(null))
      .finally(() => setIsDividendLoading(false));
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Analytics
      </Typography>

      <PortfolioPerformanceChart snapshots={snapshots} />

      <RiskMetricsCard metrics={riskMetrics} isLoading={isRiskLoading} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectorAllocationChart sectors={sectors} isLoading={isRiskLoading} />
        </Grid>
      </Grid>

      <AllocationCharts dashboardData={dashboardData} isLoading={isLoading} />

      <DividendIncomeCard summary={dividendSummary} isLoading={isDividendLoading} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <DividendHistoryChart
            monthlyHistory={dividendSummary?.monthlyHistory ?? []}
            isLoading={isDividendLoading}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <DividendByHoldingTable
            holdings={dividendSummary?.byHolding ?? []}
            isLoading={isDividendLoading}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
