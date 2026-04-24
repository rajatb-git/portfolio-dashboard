import * as React from 'react';

import apis from '@/api';
import { IMarketNews } from '@/models/MarketNews';
import { IPriceStore } from '@/models/PriceStoreModel';
import { IRecommendation } from '@/models/RecommendationModel';
import { useSearchParams } from 'react-router-dom';
import { CompanyProfile } from '@/models/CompanyProfileModel';
import { fnCurrency } from '@/utils/formatNumber';
import { Avatar, Box, Card, Chip, Divider, Grid, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import moment from 'moment';
import { toast } from 'react-toastify';
import ResearchDetailsCard from '@/components/Research/ResearchDetailsCard';
import ResearchNewsCard from '@/components/Research/ResearchNewsCard';
import ResearchMetricsCard from '@/components/Research/ResearchMetricsCard';
import ResearchPeersCard from '@/components/Research/ResearchPeersCard';
import ResearchEarningsHistoryCard from '@/components/Research/ResearchEarningsHistoryCard';
import ResearchInsiderCard from '@/components/Research/ResearchInsiderCard';
import AgentInsightsCard from '@/components/Research/AgentInsightsCard';
import { AgentInsight, AiConfig } from '@/api/live';
import { Iconify } from '@/components/Iconify';
import RecommendationDonutGraphMui from '@/components/RecommendationDonutGraphMui';
import { PriceHistoryGraph } from '@/components/PriceHistoryGraph';
import LocalStorageArray from '@/utils/localStorageArray';

function StatItem({ label, value }: { label: string; value?: string }) {
  return (
    <Box sx={{ textAlign: 'center', px: 1.5 }}>
      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.secondary' }}>
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

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
  const [agentInsight, setAgentInsight] = React.useState<AgentInsight | null>(null);
  const [agentError, setAgentError] = React.useState<string | null>(null);
  const [agentEnabled, setAgentEnabled] = React.useState(false);

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | undefined>();
  const [price, setPrice] = React.useState<IPriceStore>();
  const [recommendation, setRecommendation] = React.useState<IRecommendation>();
  const [news, setNews] = React.useState<Array<IMarketNews>>([]);
  const [metrics, setMetrics] = React.useState<any>();
  const [peers, setPeers] = React.useState<string[]>([]);
  const [earnings, setEarnings] = React.useState<any>(null);
  const [earningsHistory, setEarningsHistory] = React.useState<any[]>([]);
  const [insiderTransactions, setInsiderTransactions] = React.useState<any[]>([]);
  const [watchlist, setWatchlist] = React.useState<string[]>([]);
  const [searchText, setSearchText] = React.useState(searchParams.get('searchText')?.toUpperCase() || '');

  const getResearchData = (searchTicker: string) => {
    if (searchTicker && searchTicker.length >= 2) {
      LocalStorageArray.add('searchText', searchText.toUpperCase());

      setIsCompanyProfileLoading(true);
      apis.live
        .getCompanyProfile(searchTicker)
        .then((res) => setCompanyProfile(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsCompanyProfileLoading(false));

      setIsNewsLoading(true);
      apis.live
        .getLiveNews(searchTicker)
        .then((res) => setNews(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsNewsLoading(false));

      setIsPriceLoading(true);
      apis.live
        .getLivePrice(searchTicker)
        .then((res) => setPrice(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsPriceLoading(false));

      setIsRecommendationLoading(true);
      apis.live
        .getLiveRecommendation(searchTicker)
        .then((res) => setRecommendation(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsRecommendationLoading(false));

      setIsMetricsLoading(true);
      apis.live
        .getStockMetrics(searchTicker)
        .then((res) => setMetrics(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsMetricsLoading(false));

      setIsPeersLoading(true);
      apis.live
        .getStockPeers(searchTicker)
        .then((res) => setPeers(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsPeersLoading(false));

      setIsEarningsLoading(true);
      apis.live
        .getEarnings(searchTicker)
        .then((res) => setEarnings(res))
        .catch((err) => toast.error(err.message))
        .finally(() => setIsEarningsLoading(false));

      setIsEarningsHistoryLoading(true);
      apis.live
        .getEarningsHistory(searchTicker)
        .then((res) => setEarningsHistory(res ?? []))
        .catch((err) => {
          setEarningsHistory([]);
          toast.error(err.message || 'Failed to load earnings history');
        })
        .finally(() => setIsEarningsHistoryLoading(false));

      setIsInsiderLoading(true);
      apis.live
        .getInsiderTransactions(searchTicker)
        .then((res) => setInsiderTransactions(res ?? []))
        .catch((err) => {
          setInsiderTransactions([]);
          toast.error(err.message || 'Failed to load insider transactions');
        })
        .finally(() => setIsInsiderLoading(false));

      if (agentEnabled) {
        fetchAgentInsights(searchTicker);
      }
    }
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

  React.useEffect(() => {
    apis.watchlist.getAll()
      .then((items) => setWatchlist((items ?? []).map((i: any) => i.symbol)))
      .catch((err) => toast.error(err.message || 'Failed to load watchlist'));
    apis.live.getAiConfig()
      .then((config) => setAgentEnabled(config.enabled))
      .catch(() => {});
  }, []);

  const isInWatchlist = watchlist.includes(searchText);

  const handleWatchlistToggle = async () => {
    try {
      if (isInWatchlist) {
        await apis.watchlist.remove(searchText);
        setWatchlist((prev) => prev.filter((s) => s !== searchText));
      } else {
        await apis.watchlist.add(searchText);
        setWatchlist((prev) => [...prev, searchText]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update watchlist');
    }
  };

  const isPositive = (price?.percentChange ?? 0) >= 0;

  return (
    <Stack spacing={2}>
      {/* ── Hero header card ── */}
      <Card sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2.5} alignItems="flex-start">
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
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.75 }}>
                  <Typography variant="h6" fontWeight={700} noWrap>
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
                        border: '1px solid', borderColor: 'divider',
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
                        border: '1px solid', borderColor: 'divider',
                      }}
                    />
                  )}
                </Stack>

                <Stack direction="row" alignItems="baseline" spacing={1.5}>
                  <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1 }}>
                    {fnCurrency(price?.price)}
                  </Typography>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.4,
                      px: 0.9,
                      py: 0.3,
                      borderRadius: '6px',
                      bgcolor: isPositive ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                      border: `1px solid ${isPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    }}
                  >
                    <Iconify
                      icon={isPositive ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
                      width={14}
                      sx={{ color: isPositive ? '#4ade80' : '#f87171' }}
                    />
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: isPositive ? '#4ade80' : '#f87171',
                      }}
                    >
                      {isPositive ? '+' : ''}
                      {price?.percentChange?.toFixed(2)}%
                    </Typography>
                  </Box>
                  {!!price?.change && (
                    <Typography sx={{ fontSize: '0.82rem', color: isPositive ? '#4ade80' : '#f87171', fontWeight: 500 }}>
                      ({isPositive ? '+' : ''}{fnCurrency(price.change)})
                    </Typography>
                  )}
                </Stack>
              </>
            )}
          </Box>

          {/* Refresh + watchlist + timestamp */}
          <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}>
                <IconButton
                  size="small"
                  onClick={handleWatchlistToggle}
                  sx={{ color: isInWatchlist ? '#fbbf24' : 'text.disabled', '&:hover': { color: '#fbbf24' } }}
                >
                  <Iconify icon={isInWatchlist ? 'mdi:eye' : 'mdi:eye-outline'} width={18} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton
                  size="small"
                  onClick={() => getResearchData(searchText)}
                  sx={{ color: 'primary.main' }}
                >
                  <Iconify icon="mingcute:refresh-3-fill" width={20} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'right' }}>
              as of {moment(price?.priceDate).format('MMM D, h:mm a')}
            </Typography>
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
                  <StatItem label={s.label} value={s.value} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Card>

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
      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <Stack spacing={2} sx={{ width: '100%', height: '100%' }}>
            <ResearchDetailsCard
              companyProfile={companyProfile}
              isCompanyProfileLoading={isCompanyProfileLoading}
            />
            <RecommendationDonutGraphMui
              recommendation={recommendation}
              isLoading={isRecommendationLoading}
            />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
          <ResearchNewsCard news={news} isNewsLoading={isNewsLoading} />
        </Grid>
      </Grid>

      {/* ── Row 2: Key Metrics | Peers + Earnings ── */}
      <Grid container spacing={2} alignItems="stretch">
        <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
          <ResearchMetricsCard
            metrics={metrics}
            currentPrice={price?.price}
            isLoading={isMetricsLoading}
          />
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
      <Grid container spacing={2} alignItems="stretch">
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
