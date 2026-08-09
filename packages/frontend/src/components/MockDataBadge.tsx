import { Stack, Tooltip, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';
import { useDemoMode } from '@/contexts/DemoModeContext';

// Shown on every page (mounted in TopBar, outside the route switch) so
// there is never a page where sample data is on screen without this notice.
export default function MockDataBadge() {
  const theme = useTheme();
  const { enabled } = useDemoMode();

  if (!enabled) return null;

  const color = theme.palette.warning.main;

  return (
    <Tooltip title="Showing sample accounts and holdings — your real portfolio is hidden while Demo Mode is on" arrow>
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
        <Iconify icon="tabler:flask-2" width={14} sx={{ color }} />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}>Mock Data</Typography>
      </Stack>
    </Tooltip>
  );
}
