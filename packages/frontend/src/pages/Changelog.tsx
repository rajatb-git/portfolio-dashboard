import * as React from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import moment from 'moment';

import PageHeader from '@/components/ui/PageHeader';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import { parseChangelog } from '@/utils/parseChangelog';

type ChipColor = NonNullable<React.ComponentProps<typeof Chip>['color']>;

const SECTION_COLOR: Record<string, ChipColor> = {
  Added: 'success',
  Fixed: 'primary',
  Changed: 'info',
  Deprecated: 'warning',
  Removed: 'error',
  Security: 'secondary',
};

/** Renders `**bold**` and `` `code` `` spans from a changelog bullet as MUI-styled inline nodes. */
function renderInline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Box key={i} component="strong" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {part.slice(2, -2)}
        </Box>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Box
          key={i}
          component="code"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.85em',
            bgcolor: 'action.hover',
            px: 0.5,
            py: 0.125,
            borderRadius: 0.5,
          }}
        >
          {part.slice(1, -1)}
        </Box>
      );
    }
    return part;
  });
}

const ListItemText = (props: TypographyProps) => (
  <Typography component="li" sx={{ fontSize: FONT_SIZE.sm, color: 'text.secondary', lineHeight: 1.65 }} {...props} />
);

export default function Changelog() {
  const releases = React.useMemo(() => parseChangelog(__CHANGELOG__), []);

  return (
    <>
      <PageHeader title="Changelog" subtitle={`Portfolio Dashboard v${__APP_VERSION__} · release history`} />

      <Stack spacing={4} sx={{ maxWidth: 760 }}>
        {releases.map((release, index) => (
          <Box key={release.version}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', mb: 2 }}>
              <Typography sx={{ fontSize: FONT_SIZE.lg, fontWeight: 700, letterSpacing: '-0.01em' }}>
                v{release.version}
              </Typography>
              <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary' }}>
                {moment(release.date, 'YYYY-MM-DD').format('MMM D, YYYY')}
              </Typography>
            </Stack>

            <Stack spacing={2.5}>
              {release.sections.map((section) => (
                <Box key={section.type}>
                  <Chip
                    label={section.type}
                    color={SECTION_COLOR[section.type] || 'default'}
                    size="small"
                    sx={{ fontWeight: 700, mb: 1 }}
                  />
                  <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {section.items.map((item, i) => (
                      <ListItemText key={i}>{renderInline(item)}</ListItemText>
                    ))}
                  </Box>
                </Box>
              ))}
            </Stack>

            {index < releases.length - 1 && <Divider sx={{ mt: 4 }} />}
          </Box>
        ))}
      </Stack>
    </>
  );
}
