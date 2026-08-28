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
import type { DailyRecap, HoldingMovement, IndexMovement, PortfolioBrief } from '@/api/dashboard';
import type { MarketMover, MarketMovers } from '@/api/live';
import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import Delta from '@/components/ui/Delta';
import MarketNewsCard from '@/components/Today/MarketNewsCard';
import PortfolioBriefCard from '@/components/Today/PortfolioBriefCard';
import SessionMovementCard from '@/components/Today/SessionMovementCard';
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

// Says which session is running and which one the figures below reflect. Replaces
// the old "markets are closed" notice, which asserted a stale close even while
// pre-market prices were moving on the same screen.
function SessionBanner({ recap }: { recap: DailyRecap }) {
  const theme = useTheme();
  // Re-render on a minute tick so the countdown stays honest on a tab left open.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const closeDay = moment(recap.marketDay).format('dddd, MMMM D');
  const nextAt = moment(recap.nextSessionChange.at);
  const countdown = nextAt.isAfter(moment()) ? nextAt.fromNow() : 'shortly';
  const strong = (text: string) => (
    <Box component="span" sx={{ fontWeight: 700 }}>
      {text}
    </Box>
  );

  const copy: Record<DailyRecap['session'], { icon: string; color: string; body: React.ReactNode }> = {
    regular: {
      icon: 'mdi:bell-ring-outline',
      color: theme.palette.success.main,
      body: <>Markets are open. The figures below are live — the session closes {countdown}.</>,
    },
    'pre-market': {
      icon: 'mdi:weather-sunset-up',
      color: theme.palette.warning.main,
      body: (
        <>
          Pre-market trading is under way — the opening bell rings {countdown}. The figures below are{' '}
          {strong(closeDay)}&apos;s close; pre-market moves are shown separately above.
        </>
      ),
    },
    'post-market': {
      icon: 'mdi:weather-night',
      color: theme.palette.warning.main,
      body: (
        <>
          After-hours trading runs until {nextAt.format('h:mm A')}. The figures below are {strong(closeDay)}&apos;s
          close; after-hours moves are shown separately above.
        </>
      ),
    },
    closed: {
      icon: 'mdi:calendar-clock',
      color: theme.palette.warning.main,
      body: (
        <>
          Markets are closed. The figures below reflect the last trading session — {strong(closeDay)}. Pre-market opens{' '}
          {countdown}.
        </>
      ),
    },
  };

  const { icon, color, body } = copy[recap.session];

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: 'center',
        px: 2,
        py: 1.25,
        borderRadius: 1,
        border: '1px solid',
        borderColor: alpha(color, 0.4),
        bgcolor: alpha(color, 0.12),
      }}
    >
      <Iconify icon={icon} width={20} sx={{ color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.85rem', color: 'text.primary' }}>{body}</Typography>
    </Stack>
  );
}

export default function Today() {
  const theme = useTheme();

  const [recap, setRecap] = React.useState<DailyRecap | null>(null);
  const [recapLoading, setRecapLoading] = React.useState(true);

  const [brief, setBrief] = React.useState<PortfolioBrief | null>(null);
  const [briefLoading, setBriefLoading] = React.useState(true);
  const [briefError, setBriefError] = React.useState<string | null>(null);

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

  const loadBrief = React.useCallback(() => {
    setBriefLoading(true);
    setBriefError(null);
    apis.dashboard
      .getBrief()
      .then(setBrief)
      .catch((err) => {
        setBrief(null);
        setBriefError(err.message || 'Failed to load your brief');
        toast.error(err.message || 'Failed to load your brief');
      })
      .finally(() => setBriefLoading(false));
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
    loadBrief();
    loadMovers(false);
  }, [loadRecap, loadBrief, loadMovers]);

  const gainers = React.useMemo(
    () =>
      (recap?.holdings ?? [])
        .filter((h) => h.dayGL > 0)
        .sort((a, b) => b.dayGL - a.dayGL)
        .slice(0, 10),
    [recap]
  );
  const losers = React.useMemo(
    () =>
      (recap?.holdings ?? [])
        .filter((h) => h.dayGL < 0)
        .sort((a, b) => a.dayGL - b.dayGL)
        .slice(0, 10),
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
                  {recap.session === 'regular'
                    ? 'Portfolio day P&L'
                    : `${moment(recap.marketDay).format('ddd')} close P&L`}
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

      {/* Session banner — spells out which session the figures below reflect and
          what is trading right now, so a pre-market price is never presented as
          if it were the last close (or the reverse). */}
      {!recapLoading && recap && <SessionBanner recap={recap} />}

      {/* Lead with what changed since the user last looked, before the market at large. */}
      <PortfolioBriefCard brief={brief} loading={briefLoading} error={briefError} />

      {/* Extended-hours movement, rendered only while pre-market or after-hours runs. */}
      <SessionMovementCard extended={recap?.extended ?? null} loading={recapLoading} />

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
      <MarketNewsCard />
    </Stack>
  );
}
