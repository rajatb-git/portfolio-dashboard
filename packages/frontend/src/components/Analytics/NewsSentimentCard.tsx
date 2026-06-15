import * as React from 'react';
import {
  Box,
  Card,
  Chip,
  Divider,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { Iconify } from '@/components/Iconify';

type SymbolSentiment = {
  symbol: string;
  score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  articleCount: number;
  topHeadlines: string[];
};

type PortfolioSentiment = {
  overall: 'positive' | 'negative' | 'neutral';
  overallScore: number;
  symbols: SymbolSentiment[];
  asOf: string;
};

const SENTIMENT_CONFIG = {
  positive: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    label: 'Positive',
    icon: 'eva:trending-up-fill',
  },
  negative: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    label: 'Negative',
    icon: 'eva:trending-down-fill',
  },
  neutral: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    label: 'Neutral',
    icon: 'pepicons-pop:line-x',
  },
};

type Props = { sentiment: PortfolioSentiment | null; isLoading: boolean };

export default function NewsSentimentCard({ sentiment, isLoading }: Props) {
  const overall = sentiment ? SENTIMENT_CONFIG[sentiment.overall] : null;

  return (
    <Card variant="outlined">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: '10px 16px' }}>
        <Iconify icon="mdi:newspaper-variant-outline" width={16} sx={{ color: '#3b82f6' }} />
        <Typography
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          News Sentiment
        </Typography>
      </Stack>
      <Divider />

      {isLoading ? (
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={36} width={140} />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={28} />
          ))}
        </Stack>
      ) : !sentiment || sentiment.symbols.length === 0 ? (
        <Stack sx={{ alignItems: 'center', p: 3 }}>
          <Iconify
            icon="mdi:newspaper-variant-multiple-outline"
            width={32}
            sx={{ color: 'text.disabled', mb: 1 }}
          />
          <Typography sx={{ color: 'text.disabled', fontSize: '0.82rem' }}>
            No recent news found for holdings.
          </Typography>
        </Stack>
      ) : (
        <Box>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}
          >
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', fontWeight: 500 }}>
              Overall Portfolio Sentiment
            </Typography>
            {overall && (
              <Chip
                icon={<Iconify icon={overall.icon} width={14} />}
                label={`${overall.label} (${sentiment.overallScore > 0 ? '+' : ''}${sentiment.overallScore})`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: overall.bg,
                  color: overall.color,
                  border: `1px solid ${overall.border}`,
                  '& .MuiChip-icon': { color: overall.color },
                }}
              />
            )}
          </Stack>
          <Divider />

          {sentiment.symbols.map((s, i) => {
            const cfg = SENTIMENT_CONFIG[s.sentiment];
            const barValue = Math.round(((s.score + 1) / 2) * 100);
            return (
              <Box key={s.symbol}>
                {i > 0 && <Divider />}
                <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1, gap: 1.5 }}>
                  <Chip
                    label={s.symbol}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      minWidth: 56,
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={barValue}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': { bgcolor: cfg.color, borderRadius: 3 },
                      }}
                    />
                  </Box>
                  <Chip
                    label={cfg.label}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      bgcolor: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                    }}
                  />
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', minWidth: 52 }}>
                    {s.articleCount} articles
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}
    </Card>
  );
}
