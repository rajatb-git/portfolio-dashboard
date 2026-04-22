import { Box, Card, Chip, Divider, IconButton, List, ListItem, ListItemIcon, ListItemText, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import moment from 'moment';

import { AgentInsight } from '@/api/live';
import { Iconify } from '@/components/Iconify';

const SENTIMENT_CONFIG = {
  bullish: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', icon: 'eva:trending-up-fill', label: 'Bullish' },
  bearish: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', icon: 'eva:trending-down-fill', label: 'Bearish' },
  neutral: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: 'pepicons-pop:line-x', label: 'Neutral' },
};

type SectionProps = {
  title: string;
  icon: string;
  iconColor: string;
  items: string[];
};

function InsightSection({ title, icon, iconColor, items }: SectionProps) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Iconify icon={icon} width={15} sx={{ color: iconColor }} />
        <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </Typography>
      </Stack>
      <List dense sx={{ py: 0, px: 1 }}>
        {items.map((item, i) => (
          <ListItem key={i} sx={{ py: 0.25, px: 1 }}>
            <ListItemIcon sx={{ minWidth: 20 }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: iconColor }} />
            </ListItemIcon>
            <ListItemText
              primary={item}
              slotProps={{ primary: { sx: { fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 } } }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

type Props = {
  insight: AgentInsight | null;
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

export default function AgentInsightsCard({ insight, isLoading, error, onRefresh }: Props) {
  const sentimentStyle = insight ? SENTIMENT_CONFIG[insight.sentiment] : null;

  return (
    <Card variant="outlined" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pr: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ p: '10px 16px' }}>
          <Iconify icon="fluent:brain-sparkle-20-filled" width={16} sx={{ color: '#8b5cf6' }} />
          <Typography sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            AI Agent Insights
          </Typography>
        </Stack>
        {onRefresh && (
          <Tooltip title="Regenerate insights">
            <IconButton size="small" onClick={onRefresh} sx={{ color: 'text.disabled' }}>
              <Iconify icon="mingcute:refresh-3-fill" width={16} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
      <Divider />

      {isLoading ? (
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={16} width="30%" />
          <Skeleton variant="rounded" height={48} />
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={60} />
        </Stack>
      ) : error ? (
        <Stack alignItems="center" justifyContent="center" sx={{ p: 3, flexGrow: 1 }}>
          <Iconify icon="mdi:alert-circle-outline" width={32} sx={{ color: 'error.main', mb: 1 }} />
          <Typography sx={{ color: 'error.main', fontSize: '0.82rem', textAlign: 'center', fontWeight: 500 }}>
            Failed to load AI insights
          </Typography>
          <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem', textAlign: 'center', mt: 0.5 }}>
            {error}
          </Typography>
        </Stack>
      ) : !insight ? (
        <Stack alignItems="center" justifyContent="center" sx={{ p: 3, flexGrow: 1 }}>
          <Iconify icon="fluent:brain-sparkle-20-regular" width={32} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ color: 'text.disabled', fontSize: '0.82rem', textAlign: 'center' }}>
            No insights available yet. Click refresh to generate.
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ flexGrow: 1 }}>
          {/* Sentiment badge */}
          {sentimentStyle && (
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
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
                {insight.provider && (
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
                )}
              </Stack>
              <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
                {moment(insight.generatedAt).fromNow()}
              </Typography>
            </Stack>
          )}

          {/* Summary */}
          <Typography sx={{ px: 2, pt: 1.5, pb: 1, fontSize: '0.82rem', color: 'text.primary', lineHeight: 1.6 }}>
            {insight.summary}
          </Typography>

          <InsightSection title="Key Points" icon="mdi:lightbulb-outline" iconColor="#3b82f6" items={insight.keyPoints} />
          <InsightSection title="Catalysts" icon="mdi:rocket-launch-outline" iconColor="#22c55e" items={insight.catalysts} />
          <InsightSection title="Risks" icon="mdi:alert-outline" iconColor="#ef4444" items={insight.risks} />

          <Typography sx={{ px: 2, py: 1.5, fontSize: '0.62rem', color: 'text.disabled', fontStyle: 'italic' }}>
            AI-generated analysis — not financial advice. Verify independently.
          </Typography>
        </Box>
      )}
    </Card>
  );
}
