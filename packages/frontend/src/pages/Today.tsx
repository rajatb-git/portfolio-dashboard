import {
  Box,
  Card,
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
import { alpha } from '@mui/material/styles';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { DailyRecap, HoldingMovement, IndexMovement } from '@/api/dashboard';
import type { MarketMover, MarketMovers, MarketNewsDigest } from '@/api/live';
import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import Delta from '@/components/ui/Delta';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import StateView from '@/components/ui/StateView';
import ToolbarButton from '@/components/ui/ToolbarButton';
import { fnCurrency, fnShortenCurrency } from '@/utils/formatNumber';

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtSignedCurrency = (v: number) => `${v < 0 ? '-' : '+'}${fnCurrency(Math.abs(v))}`;
// Market movers are often sub-$1 penny names; keep precision instead of rounding to cents.
const fmtMoverPrice = (v: number) => (v >= 1 ? fnCurrency(v) : `$${v.toPrecision(2)}`);

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
    <Panel
      eyebrow={title}
      icon={icon}
      actions={action}
      flush
      dense
      sx={{ width: '100%', height: '100%' }}
      bodySx={{ '& > *': { minWidth: 0 }, '& .MuiSvgIcon-root': { color: iconColor } }}
    >
      {children}
    </Panel>
  );
}

function IndexRow({ idx }: { idx: IndexMovement }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.25, gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: FONT_SIZE.sm, fontWeight: 600 }}>
          {idx.label}
        </Typography>
        <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>{idx.symbol}</Typography>
      </Box>
      <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Typography data-numeric="" sx={{ fontSize: FONT_SIZE.sm, fontWeight: 600 }}>
          {fnCurrency(idx.price)}
        </Typography>
        <Delta value={idx.percentChange} display={fmtPct(idx.percentChange)} size="small" />
      </Stack>
    </Stack>
  );
}

function MoverRow({ h }: { h: HoldingMovement }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: FONT_SIZE.sm, fontWeight: 700 }}>{h.symbol}</Typography>
        <Typography noWrap sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled', maxWidth: 180 }}>
          {h.name}
        </Typography>
      </Box>
      <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Delta value={h.dayGL} display={fmtSignedCurrency(h.dayGL)} size="medium" />
        <Delta value={h.percentChange} display={fmtPct(h.percentChange)} size="micro" showIcon={false} />
      </Stack>
    </Stack>
  );
}

function MarketMoverRow({ m, rank }: { m: MarketMover; rank: number }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', minWidth: 0, pr: 1 }}>
        <Typography
          data-numeric=""
          sx={{ fontSize: FONT_SIZE.micro, fontWeight: 800, color: 'text.disabled', minWidth: 16 }}
        >
          {rank}
        </Typography>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: FONT_SIZE.sm, fontWeight: 700 }}>{m.symbol}</Typography>
          <Typography noWrap sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled', maxWidth: 180 }}>
            {m.name}
          </Typography>
          {m.marketCap > 0 && (
            <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
              {fnShortenCurrency(m.marketCap)} cap
            </Typography>
          )}
        </Box>
      </Stack>
      <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Typography data-numeric="" sx={{ fontSize: FONT_SIZE.sm, fontWeight: 600 }}>
          {fmtMoverPrice(m.price)}
        </Typography>
        <Delta value={m.changePercent} display={fmtPct(m.changePercent)} size="small" />
      </Stack>
    </Stack>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return <StateView state="empty" icon={icon} title={text} minHeight={140} />;
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Stack spacing={1} sx={{ p: 2 }} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={`row-${rows}-${i}`} variant="rounded" height={40} />
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

  const [movers, setMovers] = React.useState<MarketMovers | null>(null);
  const [moversLoading, setMoversLoading] = React.useState(true);
  const [moversError, setMoversError] = React.useState<string | null>(null);

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

  const loadMovers = React.useCallback((refresh = false) => {
    setMoversLoading(true);
    setMoversError(null);
    apis.live
      .getMarketMovers(refresh)
      .then((data) => setMovers(data))
      .catch((err) => {
        setMovers(null);
        setMoversError(err.message || 'Failed to load market movers');
        toast.error(err.message || 'Failed to load market movers');
      })
      .finally(() => setMoversLoading(false));
  }, []);

  React.useEffect(() => {
    loadRecap();
    loadNews(false);
    loadMovers(false);
  }, [loadRecap, loadNews, loadMovers]);

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

  return (
    <Stack spacing={2}>
      <PageHeader
        title="Today"
        subtitle={moment().format('dddd, MMMM D, YYYY')}
        actions={
          <>
            {!recapLoading && recap && (
              <Stack sx={{ alignItems: 'flex-end', mr: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: FONT_SIZE.micro,
                    color: 'text.disabled',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontWeight: 700,
                  }}
                >
                  {recap.marketDayIsToday
                    ? 'Portfolio day P&L'
                    : `Portfolio P&L · ${moment(recap.marketDay).format('ddd')}`}
                </Typography>
                <Delta
                  value={recap.totalDayGL}
                  display={`${fmtSignedCurrency(recap.totalDayGL)} (${fmtPct(recap.totalDayGLPercent)})`}
                  size="large"
                />
              </Stack>
            )}
            <ToolbarButton
              icon="tabler:refresh"
              label="Refresh today's recap"
              onClick={loadRecap}
              busy={recapLoading}
              color="primary.main"
            />
          </>
        }
      />

      {/* Session banner — when the market is closed, spell out which trading day
          the figures below actually reflect (e.g. Friday when viewed on a Sunday). */}
      {!recapLoading && recap && !recap.marketDayIsToday && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            px: 2,
            py: 1.25,
            borderRadius: 1,
            border: '1px solid',
            borderColor: alpha(theme.palette.warning.main, 0.4),
            bgcolor: alpha(theme.palette.warning.main, 0.12),
          }}
        >
          <Iconify icon="mdi:calendar-clock" width={20} sx={{ color: theme.palette.warning.main, flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>
            Markets are closed. The figures below reflect the last trading session —{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {moment(recap.marketDay).format('dddd, MMMM D')}
            </Box>
            .
          </Typography>
        </Stack>
      )}

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

      {/* Your holdings' movers */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Your Top Gainers" icon="eva:trending-up-fill" iconColor={theme.palette.success.main}>
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
          <SectionCard title="Your Top Losers" icon="eva:trending-down-fill" iconColor={theme.palette.error.main}>
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

      {/* Market-wide movers */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Market — Top 10 Movers
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {movers && (
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
              {moment(movers.generatedAt).fromNow()}
            </Typography>
          )}
          <Tooltip title="Refresh market movers">
            <span>
              <IconButton
                size="small"
                onClick={() => loadMovers(true)}
                disabled={moversLoading}
                sx={{ color: 'text.disabled' }}
              >
                <Iconify icon="mingcute:refresh-3-fill" width={16} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Market Top Gainers" icon="eva:trending-up-fill" iconColor={theme.palette.success.main}>
            {moversLoading ? (
              <ListSkeleton rows={6} />
            ) : moversError ? (
              <EmptyState icon="mdi:alert-circle-outline" text={moversError} />
            ) : movers && movers.gainers.length > 0 ? (
              <Stack divider={<Divider />}>
                {movers.gainers.map((m, i) => (
                  <MarketMoverRow key={m.symbol} m={m} rank={i + 1} />
                ))}
              </Stack>
            ) : (
              <EmptyState icon="eva:trending-up-fill" text="No market gainers available right now." />
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="Market Top Losers" icon="eva:trending-down-fill" iconColor={theme.palette.error.main}>
            {moversLoading ? (
              <ListSkeleton rows={6} />
            ) : moversError ? (
              <EmptyState icon="mdi:alert-circle-outline" text={moversError} />
            ) : movers && movers.losers.length > 0 ? (
              <Stack divider={<Divider />}>
                {movers.losers.map((m, i) => (
                  <MarketMoverRow key={m.symbol} m={m} rank={i + 1} />
                ))}
              </Stack>
            ) : (
              <EmptyState icon="eva:trending-down-fill" text="No market losers available right now." />
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Market news */}
      <SectionCard
        title="Top Market News"
        icon="mdi:newspaper-variant-outline"
        iconColor="#3b82f6"
        action={
          <Tooltip title="Refresh headlines">
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
            <Typography
              sx={{ color: 'text.disabled', fontSize: '0.75rem', textAlign: 'center', mt: 0.5, maxWidth: 420 }}
            >
              {newsError}
            </Typography>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.7rem', textAlign: 'center', mt: 1 }}>
              Top headlines are aggregated from public financial-news RSS feeds (CNBC, Nasdaq).
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
                        {a.source && (
                          <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: 'text.disabled' }}>
                            {a.source}
                          </Typography>
                        )}
                        {a.publishedAt && (
                          <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }}>
                            {moment(a.publishedAt).fromNow()}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
            <Typography sx={{ px: 2, py: 1.5, fontSize: '0.62rem', color: 'text.disabled', fontStyle: 'italic' }}>
              Top US market headlines via CNBC &amp; Nasdaq RSS{news ? ` · ${moment(news.generatedAt).fromNow()}` : ''}.
            </Typography>
          </>
        ) : (
          <EmptyState icon="mdi:newspaper-variant-outline" text="No market news available right now." />
        )}
      </SectionCard>
    </Stack>
  );
}
