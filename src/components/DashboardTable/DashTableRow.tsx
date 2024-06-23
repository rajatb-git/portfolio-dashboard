import { Avatar, Tooltip } from '@mui/material';
import { blue, green, red } from '@mui/material/colors';
import Stack from '@mui/material/Stack';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { HoldingAggregate } from '@/api/dashboard';
import Label from '@/components/Label';
import { TableCell } from '@/components/Table/TableCell';
import { fnCurrency } from '@/utils/formatNumber';

type TableRowProps = {
  row: HoldingAggregate;
  onRowClick: (symbol: string) => void;
};

export default function DashTableRow({ row, onRowClick }: TableRowProps) {
  return (
    <MuiTableRow hover tabIndex={-1} onClick={() => onRowClick(row.symbol)} sx={{ cursor: 'pointer' }}>
      <TableCell component="th" scope="row">
        <Stack direction="column" spacing={0}>
          <Typography variant="subtitle2" noWrap>
            {row.symbol}
          </Typography>

          <Typography variant="caption" noWrap>
            {row.qty} {row.type === 'crypto' ? 'coins' : 'shares'}
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

      <TableCell align="right">
        <Stack direction="column" spacing={0} alignItems="flex-end">
          {fnCurrency(row.currentPrice)}
          <Typography variant="caption" noWrap sx={{ fontSize: '11px' }}>
            {row.dayHigh?.toFixed(2)} - {row.dayLow?.toFixed(2)}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">{fnCurrency(row.marketValue)}</TableCell>

      <TableCell>{row.userId}</TableCell>

      <TableCell>
        {row.strongBuy >= 0 && (
          <>
            <Tooltip title="Strong Buy">
              <Avatar sx={{ display: 'inline-flex', height: 24, width: 24, mr: '4px', bgcolor: green[900] }}>
                <Typography sx={{ fontWeight: 700, color: 'white' }} variant="caption">
                  {row.strongBuy}
                </Typography>
              </Avatar>
            </Tooltip>
            <Tooltip title="Buy">
              <Avatar sx={{ display: 'inline-flex', height: 24, width: 24, mr: '4px', bgcolor: green[700] }}>
                <Typography sx={{ fontWeight: 700, color: 'white' }} variant="caption">
                  {row.buy}
                </Typography>
              </Avatar>
            </Tooltip>
            <Tooltip title="Hold">
              <Avatar sx={{ display: 'inline-flex', height: 24, width: 24, mr: '4px', bgcolor: blue[500] }}>
                <Typography sx={{ fontWeight: 700, color: 'white' }} variant="caption">
                  {row.hold}
                </Typography>
              </Avatar>
            </Tooltip>
            <Tooltip title="Sell">
              <Avatar sx={{ display: 'inline-flex', height: 24, width: 24, mr: '4px', bgcolor: red[500] }}>
                <Typography sx={{ fontWeight: 700, color: 'white' }} variant="caption">
                  {row.sell}
                </Typography>
              </Avatar>
            </Tooltip>
            <Tooltip title="Strong Sell">
              <Avatar sx={{ display: 'inline-flex', height: 24, width: 24, mr: '4px', bgcolor: red[900] }}>
                <Typography sx={{ fontWeight: 700, color: 'white' }} variant="caption">
                  {row.strongSell}
                </Typography>
              </Avatar>
            </Tooltip>
          </>
        )}
      </TableCell>
    </MuiTableRow>
  );
}
