import { Box, Divider, Skeleton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import moment from 'moment';
import * as React from 'react';

import type { ExtendedMovement, ExtendedRecap } from '@/api/dashboard';
import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import Delta from '@/components/ui/Delta';
import Panel from '@/components/ui/Panel';
import StateView from '@/components/ui/StateView';
import { fnCurrency } from '@/utils/formatNumber';

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtSignedCurrency = (v: number) => `${v < 0 ? '-' : '+'}${fnCurrency(Math.abs(v))}`;

const SESSION_COPY = {
  'pre-market': {
    label: 'Pre-Market',
    icon: 'mdi:weather-sunset-up',
    note: 'Trading since 4:00 AM ET. Moves are measured from the last close.',
  },
  'post-market': {
    label: 'After Hours',
    icon: 'mdi:weather-night',
    note: 'Trading until 8:00 PM ET. Moves are measured from today’s close.',
  },
} as const;

// How many holdings to list before collapsing the rest behind a summary line.
const VISIBLE_HOLDINGS = 6;

function MovementRow({ m, showValue }: { m: ExtendedMovement; showValue: boolean }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, gap: 1 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: FONT_SIZE.sm, fontWeight: 700 }}>{m.symbol}</Typography>
        <Typography noWrap sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled', maxWidth: 180 }}>
          {m.name}
        </Typography>
      </Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Stack sx={{ alignItems: 'flex-end' }}>
          <Typography data-numeric="" sx={{ fontSize: FONT_SIZE.sm, fontWeight: 600 }}>
            {fnCurrency(m.price)}
          </Typography>
          <Delta value={m.percentChange} display={fmtPct(m.percentChange)} size="micro" showIcon={false} />
        </Stack>
        {showValue && (
          <Box sx={{ minWidth: 78, textAlign: 'right' }}>
            <Delta value={m.gl} display={fmtSignedCurrency(m.gl)} size="small" />
          </Box>
        )}
      </Stack>
    </Stack>
  );
}

/**
 * Pre-market / after-hours movement, shown only while an extended session is
 * actually running. The regular-session figures elsewhere on the page are the
 * last *completed* session — this card is what has happened since.
 */
export default function SessionMovementCard({
  extended,
  loading,
}: {
  extended: ExtendedRecap | null;
  loading: boolean;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  if (loading) {
    return (
      <Panel eyebrow="Extended Hours" icon="mdi:clock-outline" flush dense sx={{ width: '100%' }}>
        <Stack spacing={1} sx={{ p: 2 }} aria-busy="true">
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={40} />
          <Skeleton variant="rounded" height={40} />
        </Stack>
      </Panel>
    );
  }

  if (!extended) return null;

  const copy = SESSION_COPY[extended.session];
  const movers = expanded ? extended.holdings : extended.holdings.slice(0, VISIBLE_HOLDINGS);
  const hidden = extended.holdings.length - movers.length;

  return (
    <Panel
      eyebrow={`${copy.label} Movement`}
      icon={copy.icon}
      flush
      dense
      sx={{ width: '100%' }}
      bodySx={{ '& .MuiSvgIcon-root': { color: theme.palette.warning.main } }}
      actions={
        extended.asOf ? (
          <Tooltip title={`Last extended-hours print ${moment(extended.asOf).format('h:mm A')} ET`}>
            <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
              {moment(extended.asOf).fromNow()}
            </Typography>
          </Tooltip>
        ) : undefined
      }
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          bgcolor: alpha(theme.palette.warning.main, 0.08),
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Iconify icon={copy.icon} width={18} sx={{ color: theme.palette.warning.main, flexShrink: 0 }} />
          <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary' }}>{copy.note}</Typography>
        </Stack>
        <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Typography
            sx={{
              fontSize: FONT_SIZE.micro,
              color: 'text.disabled',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
            }}
          >
            Since close
          </Typography>
          <Delta
            value={extended.totalGL}
            display={`${fmtSignedCurrency(extended.totalGL)} (${fmtPct(extended.totalGLPercent)})`}
            size="medium"
          />
        </Stack>
      </Stack>
      <Divider />

      {extended.indices.length > 0 && (
        <>
          <Stack divider={<Divider />}>
            {extended.indices.map((idx) => (
              <MovementRow key={idx.symbol} m={idx} showValue={false} />
            ))}
          </Stack>
          <Divider />
        </>
      )}

      {extended.holdings.length > 0 ? (
        <>
          <Stack divider={<Divider />}>
            {movers.map((m) => (
              <MovementRow key={m.symbol} m={m} showValue />
            ))}
          </Stack>
          {hidden > 0 && (
            <Box
              component="button"
              type="button"
              onClick={() => setExpanded(true)}
              sx={{
                width: '100%',
                px: 2,
                py: 1,
                border: 0,
                bgcolor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'primary.main',
                fontSize: FONT_SIZE.xs,
                fontWeight: 600,
                font: 'inherit',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              Show {hidden} more holding{hidden === 1 ? '' : 's'} trading
            </Box>
          )}
        </>
      ) : (
        <StateView
          state="empty"
          icon={copy.icon}
          title="None of your holdings have traded yet this session."
          minHeight={110}
        />
      )}
    </Panel>
  );
}
