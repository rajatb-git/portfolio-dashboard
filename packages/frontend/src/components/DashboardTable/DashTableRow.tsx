import { Avatar, Chip, Tooltip } from '@mui/material';
import { blue, green, red } from '@mui/material/colors';
import Stack from '@mui/material/Stack';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { HoldingAggregate } from '@/api/dashboard';
import Label from '@/components/Label';
import { TableCell } from '@/components/Table/TableCell';
import { fnCurrency } from '@/utils/formatNumber';

type TableRowProps = {
  row: HoldingAggregate & { accountPercent?: number };
  onRowClick: (symbol: string) => void;
};

function isNearTarget(row: HoldingAggregate): boolean {
  if (!row.targetPrice || !row.currentPrice) return false;
  return Math.abs(row.currentPrice - row.targetPrice) / row.targetPrice <= 0.05;
}

export default function DashTableRow({ row, onRowClick }: TableRowProps) {
  const nearTarget = isNearTarget(row);

  return (
    <MuiTableRow
      hover
      tabIndex={-1}
      onClick={() => onRowClick(row.symbol)}
      sx={{
        cursor: 'pointer',
        transition: 'background-color 0.1s ease',
        '&:hover': {
          backgroundColor: 'rgba(59,130,246,0.05) !important',
        },
        '&:last-child td': { borderBottom: 'none' },
      }}
    >
      <TableCell component="th" scope="row">
        <Stack direction="column" spacing={0}>
          <Stack direction="row" spacing={0.75}>
            <Typography variant="subtitle2" noWrap>
              {row.symbol}
            </Typography>
            {nearTarget && (
              <Tooltip title={`Target: ${fnCurrency(row.targetPrice)}`}>
                <Chip
                  label="Near Target"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: 'rgba(251,191,36,0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.3)',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Tooltip>
            )}
          </Stack>
          <Typography variant="caption" noWrap>
            {row.qty} {row.type === 'crypto' ? 'coins' : 'shares'}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0}>
          {fnCurrency(row.currentPrice)}
          <Typography variant="caption" noWrap>
            {row.dayLow?.toFixed(2)} - {row.dayHigh?.toFixed(2)}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0}>
          <Label
            color={row.percentChange === 0 ? 'default' : row.percentChange! > 0 ? 'success' : 'error'}
            sx={{ fontSize: '0.9rem' }}
          >
            {row.percentChange?.toFixed(2)}%
          </Label>

          <Typography variant="caption" noWrap>
            {row.priceDate}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0}>
          <Label
            color={row.totalGLPercent === 0 ? 'default' : row.totalGLPercent! > 0 ? 'success' : 'error'}
            sx={{ fontSize: '0.9rem' }}
          >
            {(row.totalGLPercent || 0) > 0 && '+'}
            {row.totalGLPercent?.toFixed(2)}%
          </Label>

          <Typography variant="caption" noWrap sx={{ fontWeight: 700 }}>
            {fnCurrency(row.totalGL)}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">{fnCurrency(row.marketValue)}</TableCell>

      <TableCell align="right">
        <Stack direction="column" spacing={0}>
          {fnCurrency(row.averagePrice * row.qty)}
          <Typography variant="caption" noWrap>
            {fnCurrency(row.averagePrice)} / Share
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">
        <Typography variant="body2" noWrap>
          {row.accountPercent != null ? `${row.accountPercent.toFixed(1)}%` : '—'}
        </Typography>
      </TableCell>

      <TableCell>{row.accountId}</TableCell>

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
