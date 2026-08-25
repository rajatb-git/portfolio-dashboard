import { Box, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import moment from 'moment';
import { Link as RouterLink } from 'react-router-dom';

import type { PortfolioBrief } from '@/api/dashboard';
import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import Panel from '@/components/ui/Panel';
import StateView from '@/components/ui/StateView';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  brief: PortfolioBrief | null;
  loading: boolean;
  error: string | null;
};

function Group({
  icon,
  color,
  label,
  count,
  children,
}: {
  icon: string;
  color: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, p: 2 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 1 }}>
        <Iconify icon={icon} width={15} sx={{ color, flexShrink: 0 }} />
        <Typography
          sx={{
            fontSize: FONT_SIZE.micro,
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 700,
          }}
        >
          {label}
        </Typography>
        {count > 0 && (
          <Chip
            label={count}
            size="small"
            sx={{ height: 15, fontSize: '0.58rem', fontWeight: 700, color, bgcolor: alpha(color, 0.14) }}
          />
        )}
      </Stack>
      {children}
    </Box>
  );
}

const Quiet = ({ text }: { text: string }) => (
  <Typography sx={{ fontSize: '0.74rem', color: 'text.disabled' }}>{text}</Typography>
);

export default function PortfolioBriefCard({ brief, loading, error }: Props) {
  const theme = useTheme();

  if (loading) {
    return (
      <Panel title="Your brief" icon="tabler:clipboard-list" flush>
        <Stack direction={{ xs: 'column', md: 'row' }} divider={<Divider flexItem />}>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={{ flex: 1, p: 2 }}>
              <Skeleton variant="text" width="55%" height={16} />
              <Skeleton variant="rounded" height={48} sx={{ mt: 1 }} />
            </Box>
          ))}
        </Stack>
      </Panel>
    );
  }

  if (error || !brief) {
    return (
      <Panel title="Your brief" icon="tabler:clipboard-list" flush>
        <StateView state="error" message={error ?? 'Failed to load your brief'} minHeight={140} />
      </Panel>
    );
  }

  const { fired, firedCount, earnings, dividends, triggeredAlerts, lookbackHours } = brief;

  return (
    <Panel
      title="Your brief"
      subtitle={`What moved while you were away · last ${lookbackHours}h`}
      icon="tabler:clipboard-list"
      flush
    >
      <Stack direction={{ xs: 'column', md: 'row' }} divider={<Divider flexItem />}>
        <Group
          icon="tabler:alert-triangle-filled"
          color={theme.palette.error.main}
          label="Needs attention"
          count={triggeredAlerts.length}
        >
          {triggeredAlerts.length === 0 ? (
            <Quiet text="No alerts are currently triggered." />
          ) : (
            <Stack spacing={0.75}>
              {triggeredAlerts.slice(0, 4).map((alert) => (
                <Box key={`${alert.symbol}-${alert.triggeredAt}`}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{alert.symbol}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }} noWrap>
                    {alert.conditionLabel}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Group>

        <Group
          icon="tabler:bell-ringing"
          color={theme.palette.primary.main}
          label="Sent to you"
          count={firedCount}
        >
          {fired.length === 0 ? (
            <Quiet text="Nothing sent in this window." />
          ) : (
            <Stack spacing={0.75}>
              {fired.slice(0, 4).map((item) => (
                <Box key={`${item.createdAt}-${item.title}`}>
                  <Typography sx={{ fontSize: '0.76rem', fontWeight: 600 }} noWrap>
                    {item.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.66rem', color: 'text.disabled' }}>
                    {moment(item.createdAt).fromNow()}
                  </Typography>
                </Box>
              ))}
              {firedCount > 4 && (
                <Typography
                  component={RouterLink}
                  to="/notifications"
                  sx={{ fontSize: '0.68rem', color: 'primary.main', textDecoration: 'none' }}
                >
                  See all {firedCount} →
                </Typography>
              )}
            </Stack>
          )}
        </Group>

        <Group icon="tabler:calendar-stats" color="#06b6d4" label="Reporting soon" count={earnings.length}>
          {earnings.length === 0 ? (
            <Quiet text="No holdings report this week." />
          ) : (
            <Stack spacing={0.75}>
              {earnings.slice(0, 4).map((entry) => (
                <Box key={`${entry.symbol}-${entry.date}`}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{entry.symbol}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                    {entry.daysAway === 0 ? 'Today' : entry.daysAway === 1 ? 'Tomorrow' : moment(entry.date).format('ddd, MMM D')}
                    {entry.hour === 'bmo' ? ' · pre-market' : entry.hour === 'amc' ? ' · after close' : ''}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Group>

        <Group icon="tabler:cash" color={theme.palette.success.main} label="Dividends due" count={dividends.length}>
          {dividends.length === 0 ? (
            <Quiet text="No payments in the next two weeks." />
          ) : (
            <Stack spacing={0.75}>
              {dividends.slice(0, 4).map((entry) => (
                <Box key={`${entry.symbol}-${entry.event}-${entry.date}`}>
                  <Typography sx={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {entry.symbol}
                    <Typography component="span" sx={{ fontSize: '0.7rem', fontWeight: 600, ml: 0.5 }}>
                      {fnCurrency(entry.amount)}
                    </Typography>
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                    {entry.event === 'ex_dividend' ? 'Ex-div' : 'Pays'} {moment(entry.date).format('MMM D')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Group>
      </Stack>
    </Panel>
  );
}
