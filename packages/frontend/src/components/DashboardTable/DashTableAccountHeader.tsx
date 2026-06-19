import Stack from '@mui/material/Stack';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import Label from '@/components/Label';
import { TableCell } from '@/components/Table/TableCell';
import { fnCurrency } from '@/utils/formatNumber';

import type { Total } from './dashTableUtils';

type Props = {
  total: Total;
  colSpan: number;
};

export default function DashTableAccountHeader({ total, colSpan }: Props) {
  return (
    <MuiTableRow sx={{ backgroundColor: 'background.default' }}>
      <TableCell colSpan={colSpan} sx={{ py: 1 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
            {total.accountName ?? total.accountId}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {fnCurrency(total.totalValue)} market value
          </Typography>
          <Label color={total.totalGL === 0 ? 'default' : total.totalGL > 0 ? 'success' : 'error'}>
            {total.totalGL > 0 ? '+' : ''}
            {fnCurrency(total.totalGL)}
          </Label>
        </Stack>
      </TableCell>
    </MuiTableRow>
  );
}
