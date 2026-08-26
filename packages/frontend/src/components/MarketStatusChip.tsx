import { Box, Skeleton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { MarketSession, MarketStatus } from '@/api/live';

const REFRESH_MS = 60_000;

type SessionMeta = { label: string; live: boolean };

const SESSION_META: Record<MarketSession, SessionMeta> = {
  regular: { label: 'Market Open', live: true },
  'pre-market': { label: 'Pre-Market', live: true },
  'post-market': { label: 'After Hours', live: true },
  closed: { label: 'Market Closed', live: false },
};

// What the *upcoming* session means for the user, phrased as an event rather
// than a state ("Opens in 2 hours", not "regular in 2 hours").
const NEXT_SESSION_COPY: Record<MarketSession, string> = {
  regular: 'Opens',
  'pre-market': 'Pre-market opens',
  'post-market': 'Regular session closes',
  closed: 'After-hours ends',
};

export default function MarketStatusChip() {
  const theme = useTheme();
  const [status, setStatus] = React.useState<MarketStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const notified = React.useRef(false);

  React.useEffect(() => {
    let active = true;

    const load = (isInitial: boolean) => {
      apis.live
        .getMarketStatus()
        .then((data) => {
          if (!active) return;
          setStatus(data);
        })
        .catch((err) => {
          if (!active) return;
          // Ambient indicator refreshes on a timer; only surface the first failure.
          if (isInitial && !notified.current) {
            notified.current = true;
            toast.error(err.message || 'Failed to load market status');
          }
          setStatus(null);
        })
        .finally(() => {
          if (active && isInitial) setLoading(false);
        });
    };

    load(true);
    const id = window.setInterval(() => load(false), REFRESH_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  if (loading) {
    return <Skeleton variant="rounded" width={132} height={30} sx={{ borderRadius: 999 }} />;
  }

  if (!status) return null;

  const meta = SESSION_META[status.session] ?? SESSION_META.closed;
  const color = meta.live
    ? status.session === 'regular'
      ? theme.palette.success.main
      : theme.palette.warning.main
    : theme.palette.text.disabled;

  const tooltip = (
    <Box sx={{ py: 0.25 }}>
      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
        {status.exchange} market · {meta.label}
      </Typography>
      {status.holiday && (
        <Typography sx={{ fontSize: '0.72rem', opacity: 0.85 }}>Holiday: {status.holiday}</Typography>
      )}
      {status.nextChange && moment(status.nextChange.at).isAfter(moment()) && (
        <Typography sx={{ fontSize: '0.72rem', opacity: 0.85 }}>
          {NEXT_SESSION_COPY[status.nextChange.session]} {moment(status.nextChange.at).fromNow()}
        </Typography>
      )}
      <Typography sx={{ fontSize: '0.68rem', opacity: 0.7, mt: 0.25 }}>
        Updated {moment(status.generatedAt).fromNow()}
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltip} arrow>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: 'center',
          height: 30,
          px: 1.25,
          borderRadius: 999,
          border: '1px solid',
          borderColor: alpha(color, 0.4),
          bgcolor: alpha(color, 0.12),
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: color,
            flexShrink: 0,
            ...(meta.live && {
              '@keyframes marketStatusPulse': {
                '0%': { boxShadow: `0 0 0 0 ${alpha(color, 0.5)}` },
                '70%': { boxShadow: `0 0 0 5px ${alpha(color, 0)}` },
                '100%': { boxShadow: `0 0 0 0 ${alpha(color, 0)}` },
              },
              animation: 'marketStatusPulse 1.8s infinite',
            }),
          }}
        />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>
          {meta.label}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
