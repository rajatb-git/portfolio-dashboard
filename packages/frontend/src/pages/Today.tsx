import * as React from 'react';

import {
  Box,
  Card,
  Chip,
  Divider,
  Grid,
  IconButton,
  Link,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import moment from 'moment';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { DailyRecap, HoldingMovement, IndexMovement } from '@/api/dashboard';
import type { MarketNewsDigest } from '@/api/live';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtSignedCurrency = (v: number) => `${v < 0 ? '-' : '+'}${fnCurrency(Math.abs(v))}`;

function SectionCard({
  title,
  icon,
  iconColor,
  action,
  children,
}: {
  title: string;
  icon: string;
  iconColor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: '10px 16px' }}>
          <Iconify icon={icon} width={16} sx={{ color: iconColor }} />
          <Typography
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Typography>
        </Stack>
        {action}
      </Stack>
      <Divider />
      <Box sx={{ flexGrow: 1 }}>{children}</Box>
    </Card>
  );
}

function IndexRow({ idx }: { idx: IndexMovement }) {
  const theme = useTheme();
  const up = idx.percentChange >= 0;
  const color = up ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25 }}>
      <Box>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>{idx.label}</Typography>
        <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>{idx.symbol}</Typography>
      </Box>
      <Stack sx={{ alignItems: 'flex-end' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.primary' }}>
          {fnCurrency(idx.price)}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Iconify icon={up ? 'eva:trending-up-fill' : 'eva:trending-down-fill'} width={14} sx={{ color }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color }}>{fmtPct(idx.percentChange)}</Typography>
        </Stack>
      </Stack>
    </Stack>
  );
}

function MoverRow({ h }: { h: HoldingMovement }) {
  const theme = useTheme();
  const up = h.dayGL >= 0;
  const color = up ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
      <Box sx={{ minWidth: 0, pr: 1 }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>{h.symbol}</Typography>
        <Typography noWrap sx={{ fontSize: '0.68rem', color: 'text.disabled', maxWidth: 180 }}>
          {h.name}
        </Typography>
      </Box>
      <Stack sx={{ alignItems: 'flex-end' }}>
        <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color }}>{fmtSignedCurrency(h.dayGL)}</Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color }}>{fmtPct(h.percentChange)}</Typography>
      </Stack>
    </Stack>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <Stack sx={{ alignItems: 'center', justifyContent: 'center', p: 3, flexGrow: 1, minHeight: 120 }}>
      <Iconify icon={icon} width={30} sx={{ color: 'text.disabled', mb: 1 }} />
      <Typography sx={{ color: 'text.disabled', fontSize: '0.8rem', textAlign: 'center' }}>{text}</Typography>
    </Stack>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={40} />
      ))}
    </Stack>
  );
}

export default function Today() {
  const theme = useTheme();

  const [recap, setRecap] = React.useState<DailyRecap | null>(null);
  const [recapLoading, setRecapLoading] = React.useState(true);

  const [news, setNews] = React.useState<MarketNewsDigest | null>(null);
  const [newsLoading, setNewsLoading] = React.useState(true);
  const [newsError, setNewsError] = React.useState<string | null>(null);

  const loadRecap = React.useCallback(() => {
    setRecapLoading(true);
    apis.dashboard
      .getDailyRecap()
      .then(setRecap)
      .catch((err) => {
        toast.error(err.message || 'Failed to load daily recap');
        setRecap(null);
      })
      .finally(() => setRecapLoading(false));
  }, []);

  const loadNews = React.useCallback((refresh = false) => {
    setNewsLoading(true);
    setNewsError(null);
    apis.live
      .getMarketNews(refresh)
      .then((digest) => setNews(digest))
      .catch((err) => {
        setNews(null);
        setNewsError(err.message || 'Failed to load market news');
        toast.error(err.message || 'Failed to load market news');
      })
      .finally(() => setNewsLoading(false));
  }, []);

  React.useEffect(() => {
    loadRecap();
    loadNews(false);
  }, [loadRecap, loadNews]);

  const gainers = React.useMemo(
    () =>
      (recap?.holdings ?? [])
        .filter((h) => h.dayGL > 0)
        .sort((a, b) => b.dayGL - a.dayGL)
        .slice(0, 5),
    [recap]
  );
  const losers = React.useMemo(
    () =>
      (recap?.holdings ?? [])
        .filter((h) => h.dayGL < 0)
        .sort((a, b) => a.dayGL - b.dayGL)
        .slice(0, 5),
    [recap]
  );

  const totalColor =
    recap && recap.totalDayGL >= 0 ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: 'text.primary' }}>Today</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>
            {moment().format('dddd, MMMM D, YYYY')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {!recapLoading && recap && (
            <Stack sx={{ alignItems: 'flex-end' }}>
              <Typography
                sx={{ fontSize: '0.62rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                Portfolio day P&L
              </Typography>
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 800, color: totalColor }}>
                {fmtSignedCurrency(recap.totalDayGL)} ({fmtPct(recap.totalDayGLPercent)})
              </Typography>
            </Stack>
          )}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadRecap} sx={{ color: 'text.disabled' }}>
              <Iconify icon="mingcute:refresh-3-fill" width={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Market movement */}
      <SectionCard title="Market Movement" icon="tabler:building-bank" iconColor="#3b82f6">
        {recapLoading ? (
          <ListSkeleton rows={3} />
        ) : recap && recap.indices.length > 0 ? (
          <Stack divider={<Divider />}>
            {recap.indices.map((idx) => (
              <IndexRow key={idx.symbol} idx={idx} />
            ))}
          </Stack>
        ) : (
          <EmptyState icon="tabler:building-bank" text="Market data unavailable right now." />
        )}
      </SectionCard>

      {/* Top movers */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Top Gainers" icon="eva:trending-up-fill" iconColor={theme.palette.success.main}>
            {recapLoading ? (
              <ListSkeleton />
            ) : gainers.length > 0 ? (
              <Stack divider={<Divider />}>
                {gainers.map((h) => (
                  <MoverRow key={h.symbol} h={h} />
                ))}
              </Stack>
            ) : (
              <EmptyState icon="eva:trending-up-fill" text="No holdings are up today." />
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Top Losers" icon="eva:trending-down-fill" iconColor={theme.palette.error.main}>
            {recapLoading ? (
              <ListSkeleton />
            ) : losers.length > 0 ? (
              <Stack divider={<Divider />}>
                {losers.map((h) => (
                  <MoverRow key={h.symbol} h={h} />
                ))}
              </Stack>
            ) : (
              <EmptyState icon="eva:trending-down-fill" text="No holdings are down today." />
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* AI market news */}
      <SectionCard
        title="AI Market News"
        icon="fluent:brain-sparkle-20-filled"
        iconColor="#8b5cf6"
        action={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {news?.provider && (
              <Chip
                label={`${news.provider} · ${news.model}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.62rem',
                  fontWeight: 500,
                  bgcolor: 'action.hover',
                  color: 'text.disabled',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              />
            )}
            <Tooltip title="Regenerate">
              <span>
                <IconButton
                  size="small"
                  onClick={() => loadNews(true)}
                  disabled={newsLoading}
                  sx={{ color: 'text.disabled' }}
                >
                  <Iconify icon="mingcute:refresh-3-fill" width={16} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        }
      >
        {newsLoading ? (
          <ListSkeleton rows={6} />
        ) : newsError ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', p: 3, flexGrow: 1, minHeight: 140 }}>
            <Iconify icon="mdi:alert-circle-outline" width={30} sx={{ color: 'error.main', mb: 1 }} />
            <Typography sx={{ color: 'error.main', fontSize: '0.82rem', textAlign: 'center', fontWeight: 500 }}>
              Couldn&apos;t load market news
            </Typography>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem', textAlign: 'center', mt: 0.5, maxWidth: 420 }}>
              {newsError}
            </Typography>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.7rem', textAlign: 'center', mt: 1 }}>
              This feature uses your configured AI provider — enable and set one up under Settings → AI Agent.
            </Typography>
          </Stack>
        ) : news && news.articles.length > 0 ? (
          <>
            <Stack divider={<Divider />}>
              {news.articles.map((a, i) => (
                <Box key={i} sx={{ px: 2, py: 1.25 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: 'text.disabled', minWidth: 18 }}>
                      {i + 1}
                    </Typography>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      {a.url ? (
                        <Link
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          underline="hover"
                          sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}
                        >
                          {a.headline}
                        </Link>
                      ) : (
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>
                          {a.headline}
                        </Typography>
                      )}
                      {a.summary && (
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5, mt: 0.25 }}>
                          {a.summary}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
                        {a.category && (
                          <Chip
                            label={a.category}
                            size="small"
                            sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'action.hover', color: 'text.disabled' }}
                          />
                        )}
                        {a.source && (
                          <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }}>{a.source}</Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Typography sx={{ px: 2, py: 1.5, fontSize: '0.62rem', color: 'text.disabled', fontStyle: 'italic' }}>
              AI-curated from public market news{news ? ` · ${moment(news.generatedAt).fromNow()}` : ''}. For
              informational purposes only.
            </Typography>
          </>
        ) : (
          <EmptyState icon="fluent:brain-sparkle-20-regular" text="No market news available right now." />
        )}
      </SectionCard>
    </Stack>
  );
}
