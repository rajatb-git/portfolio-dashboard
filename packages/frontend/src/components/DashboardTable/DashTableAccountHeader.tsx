import { alpha } from '@mui/material/styles';
import Stack from '@mui/material/Stack';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/Iconify';
import Label from '@/components/Label';
import { TableCell } from '@/components/Table/TableCell';
import { fnCurrency } from '@/utils/formatNumber';

import type { Total } from './dashTableUtils';

type Props = {
  total: Total;
  colSpan: number;
  stickyTop: number;
};

export default function DashTableAccountHeader({ total, colSpan, stickyTop }: Props) {
  return (
    <MuiTableRow>
      <TableCell
        colSpan={colSpan}
        sx={(theme) => ({
          py: 1.25,
          position: 'sticky',
          top: stickyTop,
          zIndex: 1,
          borderLeft: `4px solid ${theme.palette.primary.main}`,
          borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
          backgroundColor: theme.palette.background.paper,
          backgroundImage:
            theme.palette.mode === 'light'
              ? `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`
              : `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.primary.main, 0.08)} 100%)`,
        })}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Iconify icon="mdi:folder-account-outline" width={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
            <Typography
              noWrap
              variant="subtitle2"
              sx={{ fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'primary.main' }}
            >
              {total.accountName ?? total.accountId}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Typography variant="caption" color="text.secondary">
              {fnCurrency(total.totalValue)} market value
            </Typography>
            <Label color={total.totalGL === 0 ? 'default' : total.totalGL > 0 ? 'success' : 'error'}>
              {total.totalGL > 0 ? '+' : ''}
              {fnCurrency(total.totalGL)}
            </Label>
          </Stack>
        </Stack>
      </TableCell>
    </MuiTableRow>
  );
}
