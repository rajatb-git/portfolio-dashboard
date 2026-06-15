import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { Iconify } from '@/components/Iconify';

type PortfolioInsight = {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyObservations: string[];
  topConcerns: string[];
  opportunities: string[];
  diversification: string;
  provider: string;
  model: string;
  generatedAt: string;
};

const SENTIMENT_CONFIG = {
  bullish: {
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.25)',
    icon: 'eva:trending-up-fill',
    label: 'Bullish',
  },
  bearish: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.25)',
    icon: 'eva:trending-down-fill',
    label: 'Bearish',
  },
  neutral: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.25)',
    icon: 'pepicons-pop:line-x',
    label: 'Neutral',
  },
};

function InsightList({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: string;
  color: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <Box>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 2, pt: 1.5, pb: 0.5 }}>
        <Iconify icon={icon} width={15} sx={{ color }} />
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {title}
        </Typography>
      </Stack>
      <List dense sx={{ py: 0, px: 1 }}>
        {items.map((item, i) => (
          <ListItem key={i} sx={{ py: 0.25, px: 1 }}>
            <ListItemIcon sx={{ minWidth: 20 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: color }} />
            </ListItemIcon>
            <ListItemText
              primary={item}
              slotProps={{
                primary: { sx: { fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 } },
              }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

type Props = {
  insight: PortfolioInsight | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  aiEnabled: boolean;
};

export default function PortfolioInsightsCard({ insight, isLoading, error, onGenerate, aiEnabled }: Props) {
  const sentimentStyle = insight ? SENTIMENT_CONFIG[insight.sentiment] : null;

  return (
    <Card variant="outlined" sx={{ width: '100%' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: '10px 16px' }}>
          <Iconify icon="fluent:brain-sparkle-20-filled" width={16} sx={{ color: '#8b5cf6' }} />
          <Typography
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Portfolio AI Analysis
          </Typography>
        </Stack>
        {insight && (
          <Tooltip title="Regenerate analysis">
            <IconButton size="small" onClick={onGenerate} sx={{ color: 'text.disabled' }}>
              <Iconify icon="mingcute:refresh-3-fill" width={16} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Divider />

      {!aiEnabled ? (
        <Stack sx={{ alignItems: 'center', p: 3 }}>
          <Iconify icon="fluent:brain-sparkle-20-regular" width={32} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ color: 'text.disabled', fontSize: '0.82rem', textAlign: 'center' }}>
            Enable AI in Settings to use portfolio analysis.
          </Typography>
        </Stack>
      ) : isLoading ? (
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={16} width="30%" />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={60} />
        </Stack>
      ) : error ? (
        <Stack sx={{ alignItems: 'center', p: 3 }}>
          <Iconify icon="mdi:alert-circle-outline" width={32} sx={{ color: 'error.main', mb: 1 }} />
          <Typography sx={{ color: 'error.main', fontSize: '0.82rem', textAlign: 'center', fontWeight: 500 }}>
            Failed to generate analysis
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem', textAlign: 'center', mt: 0.5 }}>
            {error}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={onGenerate}
            sx={{ mt: 2, textTransform: 'none', fontSize: '0.78rem' }}
          >
            Try Again
          </Button>
        </Stack>
      ) : !insight ? (
        <Stack sx={{ alignItems: 'center', p: 3 }}>
          <Iconify icon="fluent:brain-sparkle-20-regular" width={32} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ color: 'text.disabled', fontSize: '0.82rem', textAlign: 'center', mb: 2 }}>
            Generate an AI analysis of your entire portfolio.
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={onGenerate}
            startIcon={<Iconify icon="fluent:brain-sparkle-20-filled" width={16} />}
            sx={{ textTransform: 'none', fontSize: '0.78rem' }}
          >
            Analyze Portfolio
          </Button>
        </Stack>
      ) : (
        <Box>
          {sentimentStyle && (
            <Stack
              direction="row"
              sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1.5 }}
            >
              <Stack direction="row" spacing={1}>
                <Chip
                  icon={<Iconify icon={sentimentStyle.icon} width={16} />}
                  label={sentimentStyle.label}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    bgcolor: sentimentStyle.bg,
                    color: sentimentStyle.color,
                    border: `1px solid ${sentimentStyle.border}`,
                    '& .MuiChip-icon': { color: sentimentStyle.color },
                  }}
                />
                <Chip
                  label={`${insight.provider} · ${insight.model}`}
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
              </Stack>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
                {moment(insight.generatedAt).fromNow()}
              </Typography>
            </Stack>
          )}
          <Typography sx={{ px: 2, pt: 1.5, pb: 1, fontSize: '0.82rem', color: 'text.primary', lineHeight: 1.6 }}>
            {insight.summary}
          </Typography>
          <InsightList
            title="Key Observations"
            icon="mdi:lightbulb-outline"
            color="#3b82f6"
            items={insight.keyObservations}
          />
          <InsightList
            title="Opportunities"
            icon="mdi:rocket-launch-outline"
            color="#22c55e"
            items={insight.opportunities}
          />
          <InsightList title="Concerns" icon="mdi:alert-outline" color="#ef4444" items={insight.topConcerns} />
          {insight.diversification && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start', px: 2, pt: 1, pb: 1.5 }}>
              <Iconify icon="mdi:chart-pie" width={15} sx={{ color: '#8b5cf6', mt: 0.2 }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 }}>
                {insight.diversification}
              </Typography>
            </Stack>
          )}
          <Typography sx={{ px: 2, py: 1, fontSize: '0.62rem', color: 'text.disabled', fontStyle: 'italic' }}>
            AI-generated analysis — not financial advice.
          </Typography>
        </Box>
      )}
    </Card>
  );
}
