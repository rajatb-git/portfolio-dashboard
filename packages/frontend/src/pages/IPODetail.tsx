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
import { useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [isIpoLoading, setIsIpoLoading] = React.useState(true);
  const [ipo, setIpo] = React.useState<IIPO | undefined>();

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | undefined>();
  const [isCompanyProfileLoading, setIsCompanyProfileLoading] = React.useState(false);

  const [news, setNews] = React.useState<Array<IMarketNews>>([]);
  const [isNewsLoading, setIsNewsLoading] = React.useState(false);

  const [agentEnabled, setAgentEnabled] = React.useState(false);
  const [agentInsight, setAgentInsight] = React.useState<AgentInsight | null>(null);
  const [isAgentLoading, setIsAgentLoading] = React.useState(false);
  const [agentError, setAgentError] = React.useState<string | null>(null);

  const fetchInsights = React.useCallback(() => {
    if (!id) return;
    setIsAgentLoading(true);
    setAgentError(null);
    apis.live
      .getIPOInsights(id)
      .then((res) => setAgentInsight(res))
      .catch((err) => {
        setAgentInsight(null);
        setAgentError(err.message || 'Failed to load AI insights');
        toast.error(err.message || 'Failed to load AI insights');
      })
      .finally(() => setIsAgentLoading(false));
  }, [id]);

  const loadCompanyData = React.useCallback((symbol: string) => {
    setIsCompanyProfileLoading(true);
    apis.live
      .getCompanyProfile(symbol)
      .then((res) => setCompanyProfile(res))
      .catch((err) => toast.error(err.message || 'Failed to load company profile'))
      .finally(() => setIsCompanyProfileLoading(false));

    setIsNewsLoading(true);
    apis.live
      .getLiveNews(symbol)
      .then((res) => setNews(res ?? []))
      .catch((err) => {
        setNews([]);
        toast.error(err.message || 'Failed to load news');
      })
      .finally(() => setIsNewsLoading(false));
  }, []);

  React.useEffect(() => {
    setIsIpoLoading(true);
    apis.live
      .getIPOs()
      .then((list) => {
        const match = list.find((x) => x.id === id);
        setIpo(match);
        if (match?.symbol) {
          loadCompanyData(match.symbol);
        }
      })
      .catch((err) => toast.error(err.message || 'Failed to load IPO'))
      .finally(() => setIsIpoLoading(false));
  }, [id, loadCompanyData]);

  React.useEffect(() => {
    apis.live
      .getAiConfig()
      .then((config) => setAgentEnabled(config.enabled))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (agentEnabled && ipo) {
      fetchInsights();
    }
  }, [agentEnabled, ipo, fetchInsights]);

  const statusColor = ipo ? STATUS_COLOR[ipo.status] ?? 'default' : 'default';

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

      {ipo && !ipo.symbol && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Iconify icon="mdi:information-outline" width={18} sx={{ color: 'text.disabled' }} />
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              This offering does not have a trading symbol assigned yet, so company profile and news are not available.
            </Typography>
          </Stack>
        </Card>
      )}

      {/* ── AI invest-or-not summary ── */}
      {agentEnabled && ipo && (
        <AgentInsightsCard
          insight={agentInsight}
          isLoading={isAgentLoading}
          error={agentError}
          onRefresh={fetchInsights}
        />
      )}

      {/* ── Company details + News ── */}
      {ipo?.symbol && (
        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
            <Box sx={{ width: '100%' }}>
              <ResearchDetailsCard companyProfile={companyProfile} isCompanyProfileLoading={isCompanyProfileLoading} />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
            <ResearchNewsCard news={news} isNewsLoading={isNewsLoading} />
          </Grid>
        </Grid>
      )}
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
