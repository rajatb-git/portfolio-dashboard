import * as React from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';
import { FONT_SIZE, RADIUS } from '@/components/ThemeRegistry/tokens';

/**
 * Loading, error, empty and not-configured are four different situations and
 * each gets its own treatment. Collapsing "the request failed" into "set this
 * up first" sends the user to fix the wrong problem.
 */
export type ViewState = 'loading' | 'error' | 'empty' | 'not-configured' | 'ready';

type StateViewProps = {
  state: ViewState;
  /** Error message, or the setup hint for `not-configured`. */
  message?: string;
  title?: string;
  icon?: string;
  action?: { label: string; onClick: () => void };
  /** Custom loading placeholder; defaults to a generic block skeleton. */
  skeleton?: React.ReactNode;
  minHeight?: number;
  children?: React.ReactNode;
};

const PRESETS = {
  error: { icon: 'tabler:alert-triangle-filled', title: 'Something went wrong', tone: 'error' },
  empty: { icon: 'tabler:database-off', title: 'No data yet', tone: 'muted' },
  'not-configured': { icon: 'tabler:settings-cog', title: 'Not configured', tone: 'info' },
} as const;

export function BlockSkeleton({ rows = 3, minHeight }: { rows?: number; minHeight?: number }) {
  return (
    <Stack spacing={1.25} sx={{ p: 2, minHeight }} aria-busy="true" aria-live="polite">
      <Skeleton variant="rounded" height={14} width="28%" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={`sk-${rows}-${i}`} variant="rounded" height={i === 0 ? 44 : 30} />
      ))}
    </Stack>
  );
}

export default function StateView({
  state,
  message,
  title,
  icon,
  action,
  skeleton,
  minHeight = 160,
  children,
}: StateViewProps) {
  const theme = useTheme();

  if (state === 'ready') return <>{children}</>;
  if (state === 'loading') return <>{skeleton ?? <BlockSkeleton minHeight={minHeight} />}</>;

  const preset = PRESETS[state];
  const tone =
    preset.tone === 'error'
      ? theme.palette.error.main
      : preset.tone === 'info'
        ? theme.palette.info.main
        : theme.palette.text.disabled;

  return (
    <Stack
      role={state === 'error' ? 'alert' : undefined}
      spacing={1}
      sx={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight, p: 3 }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: `${RADIUS.lg}px`,
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha(tone, 0.12),
          border: `1px solid ${alpha(tone, 0.24)}`,
        }}
      >
        <Iconify icon={icon ?? preset.icon} width={22} sx={{ color: tone }} aria-hidden />
      </Box>

      <Typography sx={{ fontSize: FONT_SIZE.sm, fontWeight: 650, color: 'text.primary' }}>
        {title ?? preset.title}
      </Typography>

      {message && (
        <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary', maxWidth: 380, lineHeight: 1.5 }}>
          {message}
        </Typography>
      )}

      {action && (
        <Button size="small" variant="outlined" onClick={action.onClick} sx={{ mt: 0.5 }}>
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
