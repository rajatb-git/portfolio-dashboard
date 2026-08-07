import * as React from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';

type PageHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  /** Right-aligned page-level controls (refresh, filters, primary action). */
  actions?: React.ReactNode;
  /** Rendered under the title row — filter bars, tabs, status chips. */
  children?: React.ReactNode;
};

/**
 * One heading per page, and it is the page's only `h1`. Pages must not stack a
 * second header bar underneath this one.
 */
export default function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            sx={{ fontSize: FONT_SIZE.xl, fontWeight: 680, letterSpacing: '-0.02em', lineHeight: 1.25 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary', mt: 0.25 }}>{subtitle}</Typography>
          )}
        </Box>

        {actions && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}
          >
            {actions}
          </Stack>
        )}
      </Stack>

      {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
    </Box>
  );
}
