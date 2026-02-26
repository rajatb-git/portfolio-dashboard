import * as React from 'react';

import { Stack, Typography } from '@mui/material';

import apis from '@/api';
import { HoldingAggregate, PortfolioSnapshot } from '@/api/dashboard';
import AllocationCharts from '@/components/Analytics/AllocationCharts';
import PortfolioPerformanceChart from '@/components/Analytics/PortfolioPerformanceChart';

export default function Analytics() {
  const [snapshots, setSnapshots] = React.useState<PortfolioSnapshot[]>([]);
  const [dashboardData, setDashboardData] = React.useState<HoldingAggregate[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Analytics
      </Typography>

      <PortfolioPerformanceChart snapshots={snapshots} />

      <AllocationCharts dashboardData={dashboardData} isLoading={isLoading} />
    </Stack>
  );
}
