import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import Label from '@/components/Label';
import { IHoldingsModel } from '@/models/HoldingsModel';
import { fnCurrency } from '@/utils/formatNumber';

type TableRowProps = {
  row: IHoldingsModel;
};

export default function TableRow({ row }: TableRowProps) {
  return (
    <MuiTableRow hover tabIndex={-1}>
      <TableCell component="th" scope="row">
        <Stack direction="column" spacing={0}>
          <Typography variant="subtitle2" noWrap>
            {row.symbol}
          </Typography>

          <Typography variant="caption" noWrap>
            {row.name}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>{row.userId}</TableCell>

      <TableCell align="right">{row.qty}</TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0} alignItems="flex-end">
          {row.currentPrice}

          <Typography variant="caption" noWrap sx={{ fontSize: '11px' }}>
            {row.dayHigh?.toFixed(2)} - {row.dayLow?.toFixed(2)}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0} alignItems="flex-end">
          <Label
            color={row.percentChange === 0 ? 'default' : row.percentChange! > 0 ? 'success' : 'error'}
            sx={{ fontSize: '13px' }}
          >
            {row.percentChange?.toFixed(2)}%
          </Label>

          <Typography variant="caption" noWrap>
            {row.priceDate}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0} alignItems="flex-end">
          <Label
            color={row.totalGLPercent === 0 ? 'default' : row.totalGLPercent! > 0 ? 'success' : 'error'}
            sx={{ fontSize: '13px' }}
          >
            {(row.totalGLPercent || 0) > 0 && '+'}
            {row.totalGLPercent?.toFixed(2)}%
          </Label>

          <Typography variant="caption" noWrap sx={{ fontWeight: 700 }}>
            {fnCurrency(row.totalGL)}
          </Typography>
        </Stack>
      </TableCell>
    </MuiTableRow>
  );
}
