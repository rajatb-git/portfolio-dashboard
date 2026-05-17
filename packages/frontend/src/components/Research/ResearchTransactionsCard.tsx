import * as React from 'react';
import {
  Box,
  Card,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import moment from 'moment';

import { Iconify } from '@/components/Iconify';
import { IAccount } from '@/models/AccountsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  transactions: ITransaction[];
  accounts: IAccount[];
  isLoading: boolean;
};

const actionColors: Record<string, { fg: string; bg: string; border: string }> = {
  buy: { fg: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)' },
  sell: { fg: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
};

export default function ResearchTransactionsCard({ transactions, accounts, isLoading }: Props) {
  const [expanded, setExpanded] = React.useState(false);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const sorted = React.useMemo(
    () => [...transactions].sort((a, b) => moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf()),
    [transactions]
  );

  const buyCount = sorted.filter((t) => t.action === 'buy').length;
  const sellCount = sorted.filter((t) => t.action === 'sell').length;
  const realizedPnl = sorted.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const hasRealizedPnl = sorted.some((t) => t.pnl !== undefined);

  return (
    <Card variant="outlined">
      <Stack
        direction="row"
        spacing={1}
        sx={{
          p: '10px 16px',
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Typography
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Transaction History
        </Typography>
        <Chip
          label={sorted.length}
          size="small"
          sx={{
            height: 18,
            fontSize: '0.68rem',
            fontWeight: 700,
            bgcolor: 'action.hover',
            color: 'text.secondary',
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
        {sorted.length > 0 && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
            {buyCount} buy · {sellCount} sell
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {hasRealizedPnl && (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'baseline' }}>
            <Typography
              sx={{ fontSize: '0.62rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Realized
            </Typography>
            <Typography
              sx={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: realizedPnl >= 0 ? '#4ade80' : '#f87171',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {realizedPnl >= 0 ? '+' : ''}
              {fnCurrency(realizedPnl)}
            </Typography>
          </Stack>
        )}
        <IconButton size="small" sx={{ color: 'text.disabled' }}>
          <Iconify icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
        </IconButton>
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <Divider />
        {isLoading ? (
          <Skeleton variant="rectangular" height={100} sx={{ m: 2, borderRadius: 1 }} />
        ) : sorted.length === 0 ? (
          <Typography sx={{ p: 2, fontSize: '0.78rem', color: 'text.disabled' }}>
            No transactions recorded for this symbol.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Date', 'Account', 'Action', 'Qty', 'Price', 'Total', 'P/L'].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontSize: '0.68rem',
                        color: 'text.disabled',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((t) => {
                  const colors = actionColors[t.action] ?? {
                    fg: 'text.secondary',
                    bg: 'action.hover',
                    border: 'divider',
                  };
                  const total = (t.qty ?? 0) * (t.price ?? 0);
                  return (
                    <TableRow key={t.id} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell
                        sx={{
                          fontSize: '0.78rem',
                          color: 'text.secondary',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.createdAt ? moment(t.createdAt).format('MMM D, YYYY h:mm a') : '—'}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.78rem',
                          color: 'text.primary',
                          fontWeight: 500,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {accountMap.get(t.accountId) ?? t.accountId}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Chip
                          label={t.action?.toUpperCase()}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: colors.bg,
                            color: colors.fg,
                            border: `1px solid ${colors.border}`,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.78rem',
                          color: 'text.secondary',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {t.qty?.toLocaleString()}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.78rem',
                          color: 'text.secondary',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {fnCurrency(t.price)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.78rem',
                          color: 'text.secondary',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {fnCurrency(total)}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: t.pnl === undefined ? 'text.disabled' : t.pnl >= 0 ? '#4ade80' : '#f87171',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {t.pnl === undefined ? '—' : `${t.pnl >= 0 ? '+' : ''}${fnCurrency(t.pnl)}`}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </Collapse>
    </Card>
  );
}
