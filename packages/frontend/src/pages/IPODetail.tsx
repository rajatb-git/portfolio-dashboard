import * as React from 'react';

import {
  Box,
  Card,
  Chip,
  ChipProps,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import { AgentInsight } from '@/api/live';
import AgentInsightsCard from '@/components/Research/AgentInsightsCard';
import ResearchDetailsCard from '@/components/Research/ResearchDetailsCard';
import ResearchNewsCard from '@/components/Research/ResearchNewsCard';
import { Iconify } from '@/components/Iconify';
import { CompanyProfile } from '@/models/CompanyProfileModel';
import { IIPO } from '@/models/IPOModel';
import { IMarketNews } from '@/models/MarketNews';
import { fnShortenCurrency, fnShortenNumber } from '@/utils/formatNumber';

const STATUS_COLOR: Record<IIPO['status'], ChipProps['color']> = {
  expected: 'warning',
  filed: 'info',
  priced: 'success',
  withdrawn: 'error',
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function Term({ label, value }: { label: string; value?: string }) {
  return (
    <Box sx={{ textAlign: 'center', px: 1.5 }}>
      <Typography
        sx={{
          fontSize: '0.65rem',
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.secondary' }}>{value ?? '—'}</Typography>
    </Box>
  );
}

function IPODetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const stateIpo = (location.state as { ipo?: IIPO } | null)?.ipo;

  const [ipo, setIpo] = React.useState<IIPO | undefined>(stateIpo);
  const [isIpoLoading, setIsIpoLoading] = React.useState(!stateIpo);

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | undefined>();
  const [news, setNews] = React.useState<Array<IMarketNews>>([]);
  const [isNewsLoading, setIsNewsLoading] = React.useState(false);

  const [agentEnabled, setAgentEnabled] = React.useState(false);
  const [agentInsight, setAgentInsight] = React.useState<AgentInsight | null>(null);
  const [isAgentLoading, setIsAgentLoading] = React.useState(false);
  const [agentError, setAgentError] = React.useState<string | null>(null);

  const fetchInsights = React.useCallback((target: IIPO) => {
    setIsAgentLoading(true);
    setAgentError(null);
    apis.live
      .getIPOInsights(target)
      .then((res) => setAgentInsight(res))
      .catch((err) => {
        setAgentInsight(null);
        setAgentError(err.message || 'Failed to load AI insights');
        toast.error(err.message || 'Failed to load AI insights');
      })
      .finally(() => setIsAgentLoading(false));
  }, []);

  // Company profile and news come from Finnhub's listed-stock endpoints, which only
  // return data once the company is actually trading. For pre-listing IPOs these come
  // back empty, so we treat them as best-effort enrichment and only render when present.
  const loadListedData = React.useCallback((symbol: string) => {
    apis.live
      .getCompanyProfile(symbol)
      .then((res) => setCompanyProfile(res?.name ? res : undefined))
      .catch(() => setCompanyProfile(undefined));

    setIsNewsLoading(true);
    apis.live
      .getLiveNews(symbol)
      .then((res) => setNews(res ?? []))
      .catch(() => setNews([]))
      .finally(() => setIsNewsLoading(false));
  }, []);

  React.useEffect(() => {
    if (stateIpo) {
      setIpo(stateIpo);
      return;
    }
    setIsIpoLoading(true);
    apis.live
      .getIPOs()
      .then((list) => setIpo(list.find((x) => x.id === id)))
      .catch((err) => toast.error(err.message || 'Failed to load IPO'))
      .finally(() => setIsIpoLoading(false));
  }, [id, stateIpo]);

  React.useEffect(() => {
    if (ipo?.symbol) {
      loadListedData(ipo.symbol);
    }
  }, [ipo, loadListedData]);

  React.useEffect(() => {
    apis.live
      .getAiConfig()
      .then((config) => setAgentEnabled(config.enabled))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (agentEnabled && ipo) {
      fetchInsights(ipo);
    }
  }, [agentEnabled, ipo, fetchInsights]);

  const statusColor = ipo ? STATUS_COLOR[ipo.status] ?? 'default' : 'default';
  const hasListedData = !!companyProfile || news.length > 0 || isNewsLoading;

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
        <IconButton size="small" onClick={() => navigate('/ipo-calendar')} sx={{ color: 'primary.main' }}>
          <Iconify icon="mdi:arrow-left" width={20} />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          IPO Details
        </Typography>
      </Stack>

      {/* ── Hero header ── */}
      <Card sx={{ p: 2.5 }}>
        {isIpoLoading ? (
          <Stack spacing={1}>
            <Skeleton width={260} height={28} />
            <Skeleton width={180} height={22} />
          </Stack>
        ) : !ipo ? (
          <Stack sx={{ alignItems: 'center', py: 4 }} spacing={1}>
            <Iconify icon="mdi:file-search-outline" width={32} sx={{ color: 'text.disabled' }} />
            <Typography sx={{ color: 'text.disabled', fontSize: '0.9rem' }}>IPO not found.</Typography>
          </Stack>
        ) : (
          <>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {ipo.name}
              </Typography>
              {ipo.symbol && (
                <Chip
                  label={ipo.symbol}
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
              <Chip
                size="small"
                variant="outlined"
                label={capitalize(ipo.status)}
                color={statusColor}
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 600 }}
              />
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

            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Expected {moment(ipo.date).format('MMMM D, YYYY')} ({moment(ipo.date).fromNow()})
              {ipo.exchange ? ` · ${ipo.exchange}` : ''}
            </Typography>

            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <Grid container spacing={1}>
              {[
                { label: 'Offer Price', value: ipo.price ? `$${ipo.price}` : '—' },
                { label: 'Shares', value: ipo.numberOfShares ? fnShortenNumber(ipo.numberOfShares) : '—' },
                {
                  label: 'Offering Value',
                  value: ipo.totalSharesValue ? fnShortenCurrency(ipo.totalSharesValue) : '—',
                },
                { label: 'Exchange', value: ipo.exchange || '—' },
              ].map((t) => (
                <Grid key={t.label} size={{ xs: 6, sm: 3 }}>
                  <Term label={t.label} value={t.value} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Card>

      {/* ── AI verdict: what the company does + invest-or-not ── */}
      {ipo &&
        (agentEnabled ? (
          <AgentInsightsCard
            insight={agentInsight}
            isLoading={isAgentLoading}
            error={agentError}
            onRefresh={() => fetchInsights(ipo)}
          />
        ) : (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Iconify icon="fluent:brain-sparkle-20-regular" width={18} sx={{ color: 'text.disabled' }} />
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                Enable the AI agent in Settings to get a company overview and an invest-or-avoid read on this IPO.
              </Typography>
            </Stack>
          </Card>
        ))}

      {/* ── Company profile + news (only once the company is listed) ── */}
      {ipo &&
        (hasListedData ? (
          <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
            {companyProfile && (
              <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
                <Box sx={{ width: '100%' }}>
                  <ResearchDetailsCard companyProfile={companyProfile} isCompanyProfileLoading={false} />
                </Box>
              </Grid>
            )}
            <Grid size={{ xs: 12, md: companyProfile ? 8 : 12 }} sx={{ display: 'flex' }}>
              <ResearchNewsCard news={news} isNewsLoading={isNewsLoading} />
            </Grid>
          </Grid>
        ) : (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Iconify icon="mdi:information-outline" width={18} sx={{ color: 'text.disabled' }} />
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                Company profile and news feeds become available once {ipo.name} begins trading. Until then, the AI
                overview above is the best read on this offering.
              </Typography>
            </Stack>
          </Card>
        ))}
    </Stack>
  );
}

export default function IPODetailPage() {
  return (
    <React.Suspense>
      <IPODetail />
    </React.Suspense>
  );
}
