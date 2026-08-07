import * as React from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';
import { FONT_SIZE, MOTION } from '@/components/ThemeRegistry/tokens';

import Delta from './Delta';
import Sparkline from './Sparkline';

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  /** Signed change rendered as a Delta beneath the value. */
  delta?: number | null;
  deltaFormat?: 'percent' | 'currency' | 'compactCurrency' | 'number';
  deltaDisplay?: string;
  hint?: string;
  icon?: string;
  trend?: number[];
  loading?: boolean;
  /** Emphasised variant for the single headline figure on a page. */
  emphasis?: boolean;
  onClick?: () => void;
  footer?: React.ReactNode;
  sx?: SxProps<Theme>;
};

/**
 * A single KPI. The value is the loudest element in the tile; the label is a
 * quiet uppercase kicker so a row of tiles scans as a row of numbers.
 */
export default function StatTile({
  label,
  value,
  delta,
  deltaFormat = 'percent',
  deltaDisplay,
  hint,
  icon,
  trend,
  loading,
  emphasis,
  onClick,
  footer,
  sx,
}: StatTileProps) {
  const interactive = !!onClick;

  const body = (
    <Stack spacing={emphasis ? 0.75 : 0.5} sx={{ minWidth: 0, width: '100%' }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.625, minWidth: 0 }}>
        {icon && <Iconify icon={icon} width={13} sx={{ color: 'text.disabled', flexShrink: 0 }} aria-hidden />}
        <Typography
          noWrap
          sx={{
            fontSize: FONT_SIZE.micro,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'text.secondary',
            minWidth: 0,
          }}
        >
          {label}
        </Typography>
        {hint && (
          <Tooltip title={hint}>
            <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
              <Iconify
                icon="tabler:info-circle"
                width={13}
                sx={{ color: 'text.disabled' }}
                aria-label={hint}
                role="img"
              />
            </Box>
          </Tooltip>
        )}
      </Stack>

      {loading ? (
        <Skeleton variant="rounded" height={emphasis ? 34 : 24} width="65%" />
      ) : (
        <Typography
          data-numeric=""
          noWrap
          sx={{
            fontSize: emphasis ? FONT_SIZE.display : '1.0625rem',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
            color: 'text.primary',
          }}
        >
          {value}
        </Typography>
      )}

      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, justifyContent: 'space-between', minWidth: 0 }}>
        {loading ? (
          <Skeleton variant="rounded" height={14} width="35%" />
        ) : delta != null ? (
          <Delta value={delta} format={deltaFormat} display={deltaDisplay} size={emphasis ? 'medium' : 'small'} />
        ) : (
          <Box />
        )}
        {trend && trend.length > 1 && !loading && (
          <Sparkline data={trend} width={emphasis ? 104 : 76} height={emphasis ? 30 : 22} />
        )}
      </Stack>

      {footer && !loading && <Box sx={{ pt: 0.25 }}>{footer}</Box>}
    </Stack>
  );

  return (
    <Card
      {...(interactive
        ? { component: 'button' as const, type: 'button' as const, onClick, 'aria-label': `${label} — view details` }
        : {})}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        textAlign: 'left',
        width: '100%',
        // Tiles sit in a row; equal height keeps their labels on one baseline
        // even when only some of them carry a delta or a footer.
        height: '100%',
        p: emphasis ? 2 : 1.75,
        font: 'inherit',
        color: 'inherit',
        ...(interactive && {
          cursor: 'pointer',
          transition: `border-color ${MOTION.fast} ${MOTION.easing}, background-color ${MOTION.fast} ${MOTION.easing}`,
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
        }),
        ...sx,
      }}
    >
      {body}
    </Card>
  );
}
