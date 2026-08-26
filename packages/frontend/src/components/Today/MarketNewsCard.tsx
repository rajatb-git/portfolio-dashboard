import { Box, Chip, Divider, IconButton, Link, Skeleton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { MarketNewsArticle, MarketNewsDigest, NewsCategory } from '@/api/live';
import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import Panel from '@/components/ui/Panel';
import StateView from '@/components/ui/StateView';

type Feed = 'top' | 'holdings';

const CATEGORY_FILTERS: Array<{ value: NewsCategory; label: string }> = [
  { value: 'markets', label: 'Markets' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'business', label: 'Business' },
  { value: 'economy', label: 'Economy' },
  { value: 'tech', label: 'Tech' },
  { value: 'crypto', label: 'Crypto' },
];

type FeedState = {
  digest: MarketNewsDigest | null;
  loading: boolean;
  error: string | null;
};

const EMPTY_FEED: FeedState = { digest: null, loading: true, error: null };

function ArticleRow({ article, index }: { article: MarketNewsArticle; index: number }) {
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={1.25} sx={{ px: 2, py: 1.25, alignItems: 'flex-start' }}>
      {article.imageUrl ? (
        <Box
          component="img"
          src={article.imageUrl}
          alt=""
          loading="lazy"
          // A dead image URL would otherwise leave a broken-image glyph in the list.
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = 'none';
          }}
          sx={{ width: 64, height: 48, borderRadius: 1, objectFit: 'cover', flexShrink: 0, bgcolor: 'action.hover' }}
        />
      ) : (
        <Typography
          data-numeric=""
          sx={{ fontSize: FONT_SIZE.xs, fontWeight: 800, color: 'text.disabled', minWidth: 18, pt: 0.25 }}
        >
          {index + 1}
        </Typography>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.25 }}>
          {article.symbol && (
            <Chip
              size="small"
              label={article.symbol}
              sx={{
                height: 18,
                fontSize: FONT_SIZE.micro,
                fontWeight: 800,
                bgcolor: alpha(theme.palette.primary.main, 0.14),
                color: 'primary.main',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
          {article.breaking && (
            <Tooltip title={`Market-moving language: ${article.keywords.join(', ')}`}>
              <Chip
                size="small"
                label="Market moving"
                sx={{
                  height: 18,
                  fontSize: FONT_SIZE.micro,
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.warning.main, 0.16),
                  color: 'warning.main',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Tooltip>
          )}
        </Stack>

        {article.url ? (
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ fontSize: FONT_SIZE.sm, fontWeight: 600, color: 'text.primary' }}
          >
            {article.headline}
          </Link>
        ) : (
          <Typography sx={{ fontSize: FONT_SIZE.sm, fontWeight: 600, color: 'text.primary' }}>
            {article.headline}
          </Typography>
        )}

        {article.summary && (
          <Typography
            sx={{
              fontSize: FONT_SIZE.xs,
              color: 'text.secondary',
              lineHeight: 1.5,
              mt: 0.25,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {article.summary}
          </Typography>
        )}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
          {article.source && (
            <Typography sx={{ fontSize: FONT_SIZE.micro, fontWeight: 600, color: 'text.disabled' }}>
              {article.source}
            </Typography>
          )}
          {article.publishedAt && (
            <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
              {moment(article.publishedAt).fromNow()}
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}

function ListSkeleton() {
  return (
    <Stack spacing={1} sx={{ p: 2 }} aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={`news-${i}`} variant="rounded" height={56} />
      ))}
    </Stack>
  );
}

/**
 * Market headlines with two views: the broad wire (filterable by category) and
 * the stories that actually name something in the portfolio.
 */
export default function MarketNewsCard() {
  const [feed, setFeed] = React.useState<Feed>('top');
  const [categories, setCategories] = React.useState<NewsCategory[]>([]);
  const [top, setTop] = React.useState<FeedState>(EMPTY_FEED);
  const [holdings, setHoldings] = React.useState<FeedState>(EMPTY_FEED);

  const loadTop = React.useCallback((refresh: boolean, selected: NewsCategory[]) => {
    setTop((prev) => ({ ...prev, loading: true, error: null }));
    apis.live
      .getMarketNews(refresh, selected)
      .then((digest) => setTop({ digest, loading: false, error: null }))
      .catch((err) => {
        setTop({ digest: null, loading: false, error: err.message || 'Failed to load market news' });
        toast.error(err.message || 'Failed to load market news');
      });
  }, []);

  const loadHoldings = React.useCallback((refresh: boolean) => {
    setHoldings((prev) => ({ ...prev, loading: true, error: null }));
    apis.live
      .getPortfolioNews(refresh)
      .then((digest) => setHoldings({ digest, loading: false, error: null }))
      .catch((err) => {
        setHoldings({ digest: null, loading: false, error: err.message || 'Failed to load news for your holdings' });
        toast.error(err.message || 'Failed to load news for your holdings');
      });
  }, []);

  React.useEffect(() => {
    loadTop(false, categories);
  }, [loadTop, categories]);

  // The holdings feed costs a Finnhub call per position, so it's only fetched
  // once the user actually opens that tab.
  React.useEffect(() => {
    if (feed === 'holdings' && !holdings.digest && !holdings.error) loadHoldings(false);
  }, [feed, holdings.digest, holdings.error, loadHoldings]);

  const active = feed === 'top' ? top : holdings;

  const toggleCategory = (value: NewsCategory) => {
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  };

  const refresh = () => (feed === 'top' ? loadTop(true, categories) : loadHoldings(true));

  return (
    <Panel
      eyebrow="Market News"
      icon="mdi:newspaper-variant-outline"
      flush
      dense
      sx={{ width: '100%' }}
      actions={
        <Tooltip title="Refresh headlines">
          <span>
            <IconButton size="small" onClick={refresh} disabled={active.loading} sx={{ color: 'text.disabled' }}>
              <Iconify icon="mingcute:refresh-3-fill" width={16} />
            </IconButton>
          </span>
        </Tooltip>
      }
      footer={
        <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled', fontStyle: 'italic' }}>
          {feed === 'top'
            ? 'Aggregated from public financial-news feeds (CNBC, WSJ, MarketWatch, Nasdaq, Investing.com, Seeking Alpha, Cointelegraph).'
            : 'Company news for your tickers via Finnhub, plus market headlines that name one of your holdings.'}
          {active.digest ? ` Updated ${moment(active.digest.generatedAt).fromNow()}.` : ''}
        </Typography>
      }
    >
      <Tabs
        value={feed}
        onChange={(_, value: Feed) => setFeed(value)}
        sx={{ minHeight: 38, px: 1, '& .MuiTab-root': { minHeight: 38, fontSize: FONT_SIZE.xs, fontWeight: 600 } }}
      >
        <Tab value="top" label="Top Market News" />
        <Tab
          value="holdings"
          label={
            holdings.digest?.articles.length
              ? `Your Holdings (${holdings.digest.articles.length})`
              : 'Your Holdings'
          }
        />
      </Tabs>
      <Divider />

      {feed === 'top' && (
        <>
          <Stack direction="row" spacing={0.75} sx={{ px: 2, py: 1.25, flexWrap: 'wrap', gap: 0.75 }}>
            {CATEGORY_FILTERS.map((filter) => {
              const selected = categories.includes(filter.value);
              return (
                <Chip
                  key={filter.value}
                  size="small"
                  label={filter.label}
                  onClick={() => toggleCategory(filter.value)}
                  variant={selected ? 'filled' : 'outlined'}
                  color={selected ? 'primary' : 'default'}
                  sx={{ height: 24, fontSize: FONT_SIZE.micro, fontWeight: 600 }}
                />
              );
            })}
            {categories.length > 0 && (
              <Chip
                size="small"
                label="Clear"
                onClick={() => setCategories([])}
                variant="outlined"
                sx={{ height: 24, fontSize: FONT_SIZE.micro, color: 'text.disabled' }}
              />
            )}
          </Stack>
          <Divider />
        </>
      )}

      {active.loading ? (
        <ListSkeleton />
      ) : active.error ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', p: 3, minHeight: 160 }}>
          <Iconify icon="mdi:alert-circle-outline" width={30} sx={{ color: 'error.main', mb: 1 }} />
          <Typography sx={{ color: 'error.main', fontSize: FONT_SIZE.sm, textAlign: 'center', fontWeight: 500 }}>
            Couldn&apos;t load {feed === 'top' ? 'market news' : 'news for your holdings'}
          </Typography>
          <Typography
            sx={{ color: 'text.disabled', fontSize: FONT_SIZE.xs, textAlign: 'center', mt: 0.5, maxWidth: 420 }}
          >
            {active.error}
          </Typography>
        </Stack>
      ) : active.digest && active.digest.articles.length > 0 ? (
        <Stack divider={<Divider />}>
          {active.digest.articles.map((article, i) => (
            <ArticleRow key={article.url || article.headline} article={article} index={i} />
          ))}
        </Stack>
      ) : (
        <StateView
          state="empty"
          icon="mdi:newspaper-variant-outline"
          title={
            feed === 'holdings'
              ? 'No recent news naming any of your holdings.'
              : categories.length > 0
                ? 'No headlines in the selected categories right now.'
                : 'No market news available right now.'
          }
          minHeight={160}
        />
      )}
    </Panel>
  );
}
