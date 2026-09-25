import * as React from 'react';

import apis from '@/api';
import { IMarketNews } from '@/models/MarketNews';
import { IPriceStore } from '@/models/PriceStoreModel';
import { IRecommendation } from '@/models/RecommendationModel';
import { useSearchParams } from 'react-router-dom';
import { CompanyProfile } from '@/models/CompanyProfileModel';
import { fnCurrency } from '@/utils/formatNumber';
import {
  Avatar,
  Box,
  Card,
  Chip,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { toast } from 'react-toastify';
import ResearchDetailsCard from '@/components/Research/ResearchDetailsCard';
import ResearchNewsCard from '@/components/Research/ResearchNewsCard';
import ResearchMetricsCard from '@/components/Research/ResearchMetricsCard';
import ResearchPeersCard from '@/components/Research/ResearchPeersCard';
import ResearchEarningsHistoryCard from '@/components/Research/ResearchEarningsHistoryCard';
import ResearchInsiderCard from '@/components/Research/ResearchInsiderCard';
import AgentInsightsCard from '@/components/Research/AgentInsightsCard';
import ResearchNotesCard from '@/components/Research/ResearchNotesCard';
import ResearchPositionDetailsCard from '@/components/Research/ResearchPositionDetailsCard';
import ResearchTransactionsCard from '@/components/Research/ResearchTransactionsCard';
import { AgentInsight, AiConfig } from '@/api/live';
import { HoldingAggregate } from '@/api/dashboard';
import { IAccount } from '@/models/AccountsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import Delta from '@/components/ui/Delta';
import Metric from '@/components/ui/Metric';
import StateView from '@/components/ui/StateView';
import ToolbarButton from '@/components/ui/ToolbarButton';
import RecommendationDonutGraphMui from '@/components/RecommendationDonutGraphMui';
import { PriceHistoryGraph } from '@/components/PriceHistoryGraph';
import LocalStorageArray from '@/utils/localStorageArray';

function Research() {
  const [searchParams] = useSearchParams();

  const [_isPriceLoading, setIsPriceLoading] = React.useState(true);
  const [isRecommendationLoading, setIsRecommendationLoading] = React.useState(true);
  const [isNewsLoading, setIsNewsLoading] = React.useState(true);
  const [isCompanyProfileLoading, setIsCompanyProfileLoading] = React.useState(true);
  const [isMetricsLoading, setIsMetricsLoading] = React.useState(true);
  const [isPeersLoading, setIsPeersLoading] = React.useState(true);
  const [isEarningsLoading, setIsEarningsLoading] = React.useState(true);
  const [isEarningsHistoryLoading, setIsEarningsHistoryLoading] = React.useState(true);
  const [isInsiderLoading, setIsInsiderLoading] = React.useState(true);
  const [isAgentLoading, setIsAgentLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [agentInsight, setAgentInsight] = React.useState<AgentInsight | null>(null);
  const [agentError, setAgentError] = React.useState<string | null>(null);
  const [agentEnabled, setAgentEnabled] = React.useState(false);

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | undefined>();
  const [companyProfileError, setCompanyProfileError] = React.useState<string | null>(null);
  const [price, setPrice] = React.useState<IPriceStore>();
  const [recommendation, setRecommendation] = React.useState<IRecommendation>();
  const [news, setNews] = React.useState<Array<IMarketNews>>([]);
  const [metrics, setMetrics] = React.useState<any>();
  const [peers, setPeers] = React.useState<string[]>([]);
  const [earnings, setEarnings] = React.useState<any>(null);
  const [earningsHistory, setEarningsHistory] = React.useState<any[]>([]);
  const [insiderTransactions, setInsiderTransactions] = React.useState<any[]>([]);
  const [positions, setPositions] = React.useState<HoldingAggregate[]>([]);
  const [accounts, setAccounts] = React.useState<IAccount[]>([]);
  const [isPositionsLoading, setIsPositionsLoading] = React.useState(false);
  const [symbolTransactions, setSymbolTransactions] = React.useState<ITransaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = React.useState(false);
  const [searchText, setSearchText] = React.useState(searchParams.get('searchText')?.toUpperCase() || '');
  const pricePollNotified = React.useRef(false);

  // `force` is the refresh button: it tells the backend to bypass its caches and wait
  // for live data, instead of replaying the cached payload already on screen.
  const getResearchData = (searchTicker: string, force = false): Promise<unknown> => {
    if (!searchTicker) return Promise.resolve();

    LocalStorageArray.add('searchText', searchTicker);

    setIsCompanyProfileLoading(true);
    setCompanyProfileError(null);
    const companyProfileFetch = apis.live
      .getCompanyProfile(searchTicker, force)
      .then((res) => setCompanyProfile(res))
      .catch((err) => {
        setCompanyProfile(undefined);
        setCompanyProfileError(err.message || 'Failed to load company profile');
        toast.error(err.message || 'Failed to load company profile');
      })
      .finally(() => setIsCompanyProfileLoading(false));

    setIsNewsLoading(true);
    const newsFetch = apis.live
      .getLiveNews(searchTicker, force)
      .then((res) => setNews(res))
      .catch((err) => toast.error(err.message, { toastId: err.message }))
      .finally(() => setIsNewsLoading(false));

    setIsPriceLoading(true);
    const priceFetch = apis.live
      .getLivePrice(searchTicker, force)
      .then((res) => setPrice(res))
      .catch((err) => toast.error(err.message, { toastId: err.message }))
      .finally(() => setIsPriceLoading(false));

    setIsRecommendationLoading(true);
    const recommendationFetch = apis.live
      .getLiveRecommendation(searchTicker, force)
      .then((res) => setRecommendation(res))
      .catch((err) => toast.error(err.message, { toastId: err.message }))
      .finally(() => setIsRecommendationLoading(false));

    setIsMetricsLoading(true);
    const metricsFetch = apis.live
      .getStockMetrics(searchTicker, force)
      .then((res) => setMetrics(res))
      .catch((err) => toast.error(err.message, { toastId: err.message }))
      .finally(() => setIsMetricsLoading(false));

    setIsPeersLoading(true);
    const peersFetch = apis.live
      .getStockPeers(searchTicker, force)
      .then((res) => setPeers(res))
      .catch((err) => toast.error(err.message, { toastId: err.message }))
      .finally(() => setIsPeersLoading(false));

    setIsEarningsLoading(true);
    const earningsFetch = apis.live
      .getEarnings(searchTicker, force)
      .then((res) => setEarnings(res))
      .catch((err) => toast.error(err.message, { toastId: err.message }))
      .finally(() => setIsEarningsLoading(false));

    setIsEarningsHistoryLoading(true);
    const earningsHistoryFetch = apis.live
      .getEarningsHistory(searchTicker, force)
      .then((res) => setEarningsHistory(res ?? []))
      .catch((err) => {
        setEarningsHistory([]);
        toast.error(err.message || 'Failed to load earnings history');
      })
      .finally(() => setIsEarningsHistoryLoading(false));

    setIsInsiderLoading(true);
    const insiderFetch = apis.live
      .getInsiderTransactions(searchTicker, force)
      .then((res) => setInsiderTransactions(res ?? []))
      .catch((err) => {
        setInsiderTransactions([]);
        toast.error(err.message || 'Failed to load insider transactions');
      })
      .finally(() => setIsInsiderLoading(false));

    setIsPositionsLoading(true);
    const positionsFetch = apis.holdings
      .getBySymbol(searchTicker)
      .then((res) => setPositions(res ?? []))
      .catch((err) => {
        setPositions([]);
        toast.error(err.message || 'Failed to load position details');
      })
      .finally(() => setIsPositionsLoading(false));

    setIsTransactionsLoading(true);
    const transactionsFetch = apis.transactions
      .getBySymbol(searchTicker)
      .then((res) => setSymbolTransactions(res ?? []))
      .catch((err) => {
        setSymbolTransactions([]);
        toast.error(err.message || 'Failed to load transaction history');
      })
      .finally(() => setIsTransactionsLoading(false));

    if (agentEnabled) {
      fetchAgentInsights(searchTicker);
    }

    return Promise.all([
      companyProfileFetch,
      newsFetch,
      priceFetch,
      recommendationFetch,
      metricsFetch,
      peersFetch,
      earningsFetch,
      earningsHistoryFetch,
      insiderFetch,
      positionsFetch,
      transactionsFetch,
    ]);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    getResearchData(searchText, true).finally(() => setIsRefreshing(false));
  };

  const fetchAgentInsights = (ticker: string) => {
    setIsAgentLoading(true);
    setAgentError(null);
    apis.live
      .getAgentInsights(ticker)
      .then((res) => setAgentInsight(res))
      .catch((err) => {
        setAgentInsight(null);
        setAgentError(err.message || 'Failed to load AI insights');
        toast.error(err.message || 'Failed to load AI insights');
      })
      .finally(() => setIsAgentLoading(false));
  };

  React.useEffect(() => {
    const searchTicker = searchParams.get('searchText')?.toUpperCase() || '';
    setSearchText(searchTicker);
    getResearchData(searchTicker);
  }, [searchParams]);

  // The quote keeps moving while the page sits open; without this the header shows
  // whatever it loaded with until the user navigates away. Each poll renders the
  // latest cached price and nudges the backend's revalidation forward.
  React.useEffect(() => {
    if (!searchText) return;

    const POLL_MS = 60_000;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      apis.live
        .getLivePrice(searchText)
        .then((res) => {
          pricePollNotified.current = false;
          setPrice(res);
        })
        .catch((err) => {
          // Runs on a timer — surface the first failure rather than a toast a minute.
          if (pricePollNotified.current) return;
          pricePollNotified.current = true;
          toast.error(err.message || 'Failed to refresh price');
        });
    };

    const timer = window.setInterval(tick, POLL_MS);
    // Catch up immediately when the tab comes back after being hidden.
    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [searchText]);

  React.useEffect(() => {
    apis.live
      .getAiConfig()
      .then((config) => setAgentEnabled(config.enabled))
      .catch((err) => toast.error(err.message || 'Failed to load AI config'));
    apis.accounts
      .getAll()
      .then((res) => setAccounts(res ?? []))
      .catch((err) => toast.error(err.message || 'Failed to load accounts'));
  }, []);

  const isPositive = (price?.percentChange ?? 0) >= 0;
  const notFound = !!searchText && !isCompanyProfileLoading && !companyProfileError && !companyProfile?.name;

  if (!searchText) {
    return (
      <Card>
        <StateView
          state="empty"
          icon="tabler:search"
          title="Search for a ticker"
          message="Press ⌘K (Ctrl+K) to look up a stock or crypto symbol."
          minHeight={280}
        />
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card>
        <StateView
          state="empty"
          icon="tabler:zoom-question"
          title={`No data found for "${searchText}"`}
          message="Double-check the ticker symbol and try again. Press ⌘K to search for another."
          minHeight={280}
        />
      </Card>
    );
  }

  if (searchText && !isCompanyProfileLoading && companyProfileError) {
    return (
      <Card>
        <StateView
          state="error"
          title="Failed to load research data"
          message={companyProfileError}
          minHeight={280}
          action={{ label: 'Retry', onClick: () => getResearchData(searchText) }}
        />
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      {/* ── Hero header card ── */}
      <Card sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2.5} sx={{ alignItems: 'flex-start' }}>
          {/* Logo */}
          {isCompanyProfileLoading ? (
            <Skeleton variant="rounded" width={60} height={60} sx={{ borderRadius: '12px', flexShrink: 0 }} />
          ) : (
            <Avatar
              src={companyProfile?.logo}
              alt={companyProfile?.name}
              variant="rounded"
              sx={{
                width: 60,
                height: 60,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            />
          )}

          {/* Name + price */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {isCompanyProfileLoading ? (
              <Stack spacing={1}>
                <Skeleton width={240} height={28} />
                <Skeleton width={160} height={22} />
              </Stack>
            ) : (
              <>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
                    {companyProfile?.name}
                  </Typography>
                  {companyProfile?.ticker && (
                    <Chip
                      label={companyProfile.ticker}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        bgcolor: 'rgba(59,130,246,0.14)',
                        color: 'primary.main',
                        border: '1px solid rgba(59,130,246,0.30)',
                        letterSpacing: '0.04em',
                      }}
                    />
                  )}
                  {companyProfile?.exchange && (
                    <Chip
                      label={companyProfile.exchange}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 500,
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  )}
                  {companyProfile?.industry && (
                    <Chip
                      label={companyProfile.industry}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.68rem',
                        fontWeight: 500,
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                  )}
                </Stack>

                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <Typography
                    data-numeric=""
                    sx={{ fontSize: FONT_SIZE.display, fontWeight: 700, lineHeight: 1, letterSpacing: '-0.03em' }}
                  >
                    {fnCurrency(price?.price)}
                  </Typography>
                  <Delta
                    value={price?.percentChange}
                    display={`${isPositive ? '+' : ''}${price?.percentChange?.toFixed(2)}%`}
                    variant="chip"
                    size="medium"
                  />
                  {!!price?.change && (
                    <Delta
                      value={price.change}
                      display={`(${isPositive ? '+' : ''}${fnCurrency(price.change)})`}
                      size="small"
                      showIcon={false}
                    />
                  )}
                </Stack>
              </>
            )}
          </Box>

          {/* Market status + refresh + timestamp */}
          <Stack spacing={0.5} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <ToolbarButton
                icon="tabler:refresh"
                label={`Refresh ${searchText || 'research'} data`}
                onClick={handleRefresh}
                busy={isRefreshing}
                color="primary.main"
                size={19}
              />
            </Stack>
            <Tooltip title={price ? `Last checked ${moment(price.updatedAt).format('MMM D, h:mm:ss a')}` : ''}>
              <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>
                as of {moment(price?.priceDate).format('MMM D, h:mm a')}
              </Typography>
            </Tooltip>
          </Stack>
        </Stack>

        {/* Day stats row */}
        {(price?.open || price?.dayHigh) && (
          <>
            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <Grid container spacing={1}>
              {[
                { label: 'Open', value: price?.open ? fnCurrency(price.open) : '—' },
                { label: 'High', value: price?.dayHigh ? fnCurrency(price.dayHigh) : '—' },
                { label: 'Low', value: price?.dayLow ? fnCurrency(price.dayLow) : '—' },
                { label: 'Prev Close', value: price?.prevClose ? fnCurrency(price.prevClose) : '—' },
              ].map((s) => (
                <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
                  <Metric label={s.label} value={s.value ?? '—'} sx={{ textAlign: 'center', px: 1.5 }} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Card>

      {/* ── Position Details ── */}
      {searchText && (
        <ResearchPositionDetailsCard positions={positions} accounts={accounts} isLoading={isPositionsLoading} />
      )}

      {/* ── Transaction History (collapsed by default) ── */}
      {searchText && (
        <ResearchTransactionsCard
          transactions={symbolTransactions}
          accounts={accounts}
          isLoading={isTransactionsLoading}
        />
      )}

      {/* ── Notes & Thesis ── */}
      {searchText && <ResearchNotesCard symbol={searchText} />}

      {/* ── AI Agent Insights ── */}
      {agentEnabled && searchText && (
        <AgentInsightsCard
          insight={agentInsight}
          isLoading={isAgentLoading}
          error={agentError}
          onRefresh={() => fetchAgentInsights(searchText)}
        />
      )}

      {/* ── Row 1: Details + Recommendations | News ── */}
      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <Stack spacing={2} sx={{ width: '100%', height: '100%' }}>
            <ResearchDetailsCard companyProfile={companyProfile} isCompanyProfileLoading={isCompanyProfileLoading} />
            <RecommendationDonutGraphMui recommendation={recommendation} isLoading={isRecommendationLoading} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
          <ResearchNewsCard news={news} isNewsLoading={isNewsLoading} />
        </Grid>
      </Grid>

      {/* ── Row 2: Key Metrics | Peers + Earnings ── */}
      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
          <ResearchMetricsCard metrics={metrics} currentPrice={price?.price} isLoading={isMetricsLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <ResearchPeersCard
            peers={peers}
            earnings={earnings}
            currentSymbol={searchText}
            isPeersLoading={isPeersLoading}
            isEarningsLoading={isEarningsLoading}
          />
        </Grid>
      </Grid>

      {/* ── Row 3: Earnings History | Insider Transactions ── */}
      <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <ResearchEarningsHistoryCard history={earningsHistory} isLoading={isEarningsHistoryLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
          <ResearchInsiderCard transactions={insiderTransactions} isLoading={isInsiderLoading} />
        </Grid>
      </Grid>

      {/* ── Price chart (full width) ── */}
      <PriceHistoryGraph symbol={searchText} />
    </Stack>
  );
}

export default function ResearchPage() {
  return (
    <React.Suspense>
      <Research />
    </React.Suspense>
  );
}
