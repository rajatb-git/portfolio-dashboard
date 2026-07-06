import {
  Box,
  Card,
  Chip,
  Divider,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import moment from 'moment';

type Props = {
  transactions: any[];
  isLoading: boolean;
};

function formatValue(v: number | null): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

export default function ResearchInsiderCard({ transactions, isLoading }: Props) {
  const rows = (transactions ?? []).slice(0, 10);

  return (
    <Card variant="outlined">
      <Typography
        sx={{
          p: '10px 16px',
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Insider Transactions
      </Typography>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={120} sx={{ m: 2, borderRadius: 1 }} />
      ) : rows.length === 0 ? (
        <Typography sx={{ p: 2, fontSize: '0.78rem', color: 'text.disabled' }}>
          No insider transactions found.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Name', 'Type', 'Shares', 'Value', 'Date'].map((h) => (
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
              {rows.map((tx: any, i: number) => {
                const isBuy = (tx.transactionType ?? tx.change ?? 0) > 0 || tx.transactionType === 'Buy';
                const txLabel = isBuy ? 'Buy' : 'Sell';
                return (
                  <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell
                      sx={{
                        fontSize: '0.78rem',
                        color: 'text.primary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tx.name ?? '—'}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Chip
                        label={txLabel}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: isBuy ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                          color: isBuy ? '#4ade80' : '#f87171',
                          border: `1px solid ${isBuy ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
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
                      {tx.share != null ? Math.abs(tx.share).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.78rem',
                        color: 'text.secondary',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {formatValue(tx.value ?? null)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.78rem',
                        color: 'text.disabled',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {tx.filingDate ? moment(tx.filingDate).format('MMM D, YYYY') : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
