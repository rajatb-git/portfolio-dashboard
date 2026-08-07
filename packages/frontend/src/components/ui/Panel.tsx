import * as React from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';

type PanelProps = {
  title?: React.ReactNode;
  /** Small uppercase kicker above the title. */
  eyebrow?: string;
  subtitle?: React.ReactNode;
  icon?: string;
  /** Right-aligned controls in the header row. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Removes body padding — use when the body is a table or chart. */
  flush?: boolean;
  dense?: boolean;
  children?: React.ReactNode;
  sx?: SxProps<Theme>;
  bodySx?: SxProps<Theme>;
};

/**
 * The app's one container. Every card-shaped surface goes through this so
 * header rhythm, border treatment and padding stay identical everywhere.
 */
export default function Panel({
  title,
  eyebrow,
  subtitle,
  icon,
  actions,
  footer,
  flush,
  dense,
  children,
  sx,
  bodySx,
}: PanelProps) {
  const hasHeader = !!(title || eyebrow || actions || icon);
  const pad = dense ? 1.5 : 2;

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', ...sx }}>
      {hasHeader && (
        <>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              gap: 1.25,
              px: pad,
              py: dense ? 1 : 1.25,
              minHeight: dense ? 40 : 48,
            }}
          >
            {icon && (
              <Iconify
                icon={icon}
                width={18}
                sx={{ color: 'text.secondary', flexShrink: 0 }}
                aria-hidden
              />
            )}

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              {eyebrow && (
                <Typography
                  sx={{
                    fontSize: FONT_SIZE.micro,
                    fontWeight: 700,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'text.disabled',
                    lineHeight: 1.2,
                  }}
                >
                  {eyebrow}
                </Typography>
              )}
              {title && (
                <Typography noWrap sx={{ fontSize: FONT_SIZE.md, fontWeight: 650, color: 'text.primary' }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary', lineHeight: 1.4 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>

            {actions && (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
                {actions}
              </Stack>
            )}
          </Stack>
          <Divider />
        </>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0, ...(flush ? {} : { p: pad }), ...bodySx }}>{children}</Box>

      {footer && (
        <>
          <Divider />
          <Box sx={{ px: pad, py: dense ? 1 : 1.25 }}>{footer}</Box>
        </>
      )}
    </Card>
  );
}
