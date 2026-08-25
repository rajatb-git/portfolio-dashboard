import * as React from 'react';

import { Box, Grid, Stack, Tab, Tabs } from '@mui/material';
import { toast } from 'react-toastify';

import { Iconify } from '@/components/Iconify';
import PageHeader from '@/components/ui/PageHeader';
import LocalStorageUtil from '@/utils/localStorage';

import apis from '@/api';
import type { DividendSummary } from '@/api/analytics';
import type { HoldingAggregate, PortfolioSnapshot } from '@/api/dashboard';
import type {
  CorrelationMatrix,
  MonthlyReturns,
  RealizedGains,
  RiskMetrics,
  SectorAllocation,
  TaxLossHarvesting,
} from '@/api/analytics';
import AllocationCharts from '@/components/Analytics/AllocationCharts';
import CorrelationMatrixCard from '@/components/Analytics/CorrelationMatrixCard';
import DividendIncomeCard from '@/components/Analytics/DividendIncomeCard';
import MonthlyReturnsCard from '@/components/Analytics/MonthlyReturnsCard';
import NewsSentimentCard from '@/components/Analytics/NewsSentimentCard';
import PerformanceAttributionCard from '@/components/Analytics/PerformanceAttributionCard';
import PortfolioGoalCard from '@/components/Analytics/PortfolioGoalCard';
import PortfolioInsightsCard from '@/components/Analytics/PortfolioInsightsCard';
import PortfolioPerformanceChart from '@/components/Analytics/PortfolioPerformanceChart';
import RealizedGainsCard from '@/components/Analytics/RealizedGainsCard';
import RiskMetricsCard from '@/components/Analytics/RiskMetricsCard';
import SectorAllocationChart from '@/components/Analytics/SectorAllocationChart';
import TaxLossHarvestingCard from '@/components/Analytics/TaxLossHarvestingCard';

// Ten stacked cards is a scroll, not a structure. Grouping them by the question
// the user is asking keeps each view to a single screen.
const TABS = [
  { value: 'performance', label: 'Performance', icon: 'tabler:chart-line' },
  { value: 'risk', label: 'Risk', icon: 'tabler:shield-half' },
  { value: 'allocation', label: 'Allocation', icon: 'tabler:chart-donut' },
  { value: 'income', label: 'Income', icon: 'tabler:cash' },
  { value: 'tax', label: 'Realized & Tax', icon: 'tabler:receipt-tax' },
] as const;

type AnalyticsTab = (typeof TABS)[number]['value'];

const TAB_KEY = 'analytics_tab';

export default function Analytics() {
  const [tab, setTab] = React.useState<AnalyticsTab>(
    () => LocalStorageUtil.getItem<AnalyticsTab>(TAB_KEY) ?? 'performance'
  );

  const handleTabChange = (_event: React.SyntheticEvent, value: AnalyticsTab) => {
    setTab(value);
    LocalStorageUtil.setItem(TAB_KEY, value);
  };

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

  const [realizedGains, setRealizedGains] = React.useState<RealizedGains | null>(null);
  const [isRealizedLoading, setIsRealizedLoading] = React.useState(true);

  const [taxLoss, setTaxLoss] = React.useState<TaxLossHarvesting | null>(null);
  const [isTaxLossLoading, setIsTaxLossLoading] = React.useState(true);

  const [monthlyReturns, setMonthlyReturns] = React.useState<MonthlyReturns | null>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = React.useState(true);

  const [correlation, setCorrelation] = React.useState<CorrelationMatrix | null>(null);
  const [isCorrelationLoading, setIsCorrelationLoading] = React.useState(true);

  const [dividends, setDividends] = React.useState<DividendSummary | null>(null);
  const [isDividendsLoading, setIsDividendsLoading] = React.useState(true);
  const [dividendsError, setDividendsError] = React.useState<string | null>(null);

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

    setIsRealizedLoading(true);
    apis.analytics
      .getRealizedGains()
      .then((data) => setRealizedGains(data))
      .catch((err) => toast.error(err.message || 'Failed to load realized gains'))
      .finally(() => setIsRealizedLoading(false));

    setIsTaxLossLoading(true);
    apis.analytics
      .getTaxLossHarvesting()
      .then((data) => setTaxLoss(data))
      .catch((err) => toast.error(err.message || 'Failed to load tax-loss harvesting'))
      .finally(() => setIsTaxLossLoading(false));

    setIsMonthlyLoading(true);
    apis.analytics
      .getMonthlyReturns()
      .then((data) => setMonthlyReturns(data))
      .catch((err) => toast.error(err.message || 'Failed to load monthly returns'))
      .finally(() => setIsMonthlyLoading(false));

    setIsCorrelationLoading(true);
    apis.analytics
      .getCorrelation()
      .then((data) => setCorrelation(data))
      .catch((err) => toast.error(err.message || 'Failed to load correlation matrix'))
      .finally(() => setIsCorrelationLoading(false));

    setIsDividendsLoading(true);
    setDividendsError(null);
    apis.analytics
      .getDividends()
      .then((data) => setDividends(data))
      .catch((err) => {
        setDividends(null);
        setDividendsError(err.message || 'Failed to load dividend income');
        toast.error(err.message || 'Failed to load dividend income');
      })
      .finally(() => setIsDividendsLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Performance, risk, allocation and tax across the whole portfolio"
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Analytics sections"
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 42 }}
        >
          {TABS.map(({ value, label, icon }) => (
            <Tab
              key={value}
              value={value}
              label={label}
              icon={<Iconify icon={icon} width={16} aria-hidden />}
              iconPosition="start"
              id={`analytics-tab-${value}`}
              aria-controls={`analytics-panel-${value}`}
              sx={{ minHeight: 42 }}
            />
          ))}
        </Tabs>
      </PageHeader>

      <Box role="tabpanel" id={`analytics-panel-${tab}`} aria-labelledby={`analytics-tab-${tab}`}>
        {tab === 'performance' && (
          <Stack spacing={2}>
            <PortfolioPerformanceChart snapshots={snapshots} />
            <PortfolioGoalCard />
            <MonthlyReturnsCard data={monthlyReturns} isLoading={isMonthlyLoading} />
            <PerformanceAttributionCard attribution={attribution} isLoading={isAttributionLoading} />
          </Stack>
        )}

        {tab === 'risk' && (
          <Stack spacing={2}>
            <RiskMetricsCard metrics={riskMetrics} isLoading={isRiskLoading} />
            <CorrelationMatrixCard data={correlation} isLoading={isCorrelationLoading} />
            <NewsSentimentCard sentiment={sentiment} isLoading={isSentimentLoading} />
          </Stack>
        )}

        {tab === 'allocation' && (
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <SectorAllocationChart sectors={sectors} isLoading={isRiskLoading} />
              </Grid>
              <Grid size={{ xs: 12, lg: 6 }}>
                <PortfolioInsightsCard />
              </Grid>
            </Grid>
            <AllocationCharts dashboardData={dashboardData} isLoading={isLoading} />
          </Stack>
        )}

        {tab === 'income' && (
          <DividendIncomeCard data={dividends} isLoading={isDividendsLoading} error={dividendsError} />
        )}

        {tab === 'tax' && (
          <Stack spacing={2}>
            <RealizedGainsCard data={realizedGains} isLoading={isRealizedLoading} />
            <TaxLossHarvestingCard data={taxLoss} isLoading={isTaxLossLoading} />
          </Stack>
        )}
      </Box>
    </>
  );
}
