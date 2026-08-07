import * as React from 'react';

import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';

type MetricProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** `row` puts label and value on one line — use inside dense detail lists. */
  layout?: 'row' | 'stack';
  valueColor?: string;
  sx?: SxProps<Theme>;
};

/**
 * A label/value pair. Lighter than StatTile: no card, no delta, no sparkline —
 * for the long detail lists on Research and Analytics.
 */
export default function Metric({ label, value, hint, layout = 'stack', valueColor, sx }: MetricProps) {
  const labelNode = (
    <Typography
      sx={{
        fontSize: FONT_SIZE.xs,
        color: 'text.secondary',
        whiteSpace: 'nowrap',
        ...(layout === 'stack' && {
          fontSize: FONT_SIZE.micro,
          fontWeight: 700,
          letterSpacing: '0.055em',
          textTransform: 'uppercase',
          color: 'text.disabled',
        }),
      }}
    >
      {label}
    </Typography>
  );

  const valueNode = (
    <Typography
      data-numeric=""
      sx={{
        fontSize: FONT_SIZE.sm,
        fontWeight: 600,
        color: valueColor ?? 'text.primary',
        textAlign: layout === 'row' ? 'right' : 'left',
        minWidth: 0,
      }}
    >
      {value}
    </Typography>
  );

  const content =
    layout === 'row' ? (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', justifyContent: 'space-between', ...sx }}>
        {labelNode}
        {valueNode}
      </Stack>
    ) : (
      <Stack spacing={0.375} sx={{ minWidth: 0, ...sx }}>
        {labelNode}
        {valueNode}
      </Stack>
    );

  return hint ? (
    <Tooltip title={hint}>
      <span style={{ display: 'block' }}>{content}</span>
    </Tooltip>
  ) : (
    content
  );
}
