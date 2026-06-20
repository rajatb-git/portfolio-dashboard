import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  MenuItem,
  Select,
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
import * as React from 'react';

import type { RealizedGains } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  data: RealizedGains | null;
  isLoading: boolean;
};

const gainColor = (v: number) => (v >= 0 ? '#22c55e' : '#ef4444');
const signed = (v: number) => `${v >= 0 ? '+' : ''}${fnCurrency(v)}`;

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function RealizedGainsCard({ data, isLoading }: Props) {
  const years = data?.byYear.map((y) => y.year) ?? [];
  const [year, setYear] = React.useState<number | 'all'>('all');

  React.useEffect(() => {
    if (years.length > 0) setYear(years[0]);
  }, [data]);

  const lots = React.useMemo(() => {
    if (!data) return [];
    return year === 'all' ? data.lots : data.lots.filter((l) => l.year === year);
  }, [data, year]);

  const summary = React.useMemo(() => {
    if (!data) return null;
    if (year === 'all') return data.totals;
    return data.byYear.find((y) => y.year === year) ?? null;
  }, [data, year]);

  const handleExport = () => {
    if (!lots.length) return;
    const header = ['Symbol', 'Acquired', 'Sold', 'Quantity', 'Proceeds', 'Cost Basis', 'Gain/Loss', 'Term'];
    const rows = lots.map((l) => [
      l.symbol,
      moment(l.acquiredDate).format('YYYY-MM-DD'),
      moment(l.soldDate).format('YYYY-MM-DD'),
      l.qty,
      l.proceeds,
      l.costBasis,
      l.gain,
      l.term === 'long' ? 'Long-term' : 'Short-term',
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `realized-gains-${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="mdi:cash-register" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Realized Gains (Tax)
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {!isLoading && years.length > 0 && (
          <>
            <Select
              size="small"
              value={year}
              onChange={(e) => setYear(e.target.value as number | 'all')}
              sx={{ fontSize: '0.78rem', height: 32 }}
            >
              <MenuItem value="all">All years</MenuItem>
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="mdi:download" width={15} />}
              onClick={handleExport}
              disabled={!lots.length}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              CSV
            </Button>
          </>
        )}
      </Stack>
      <Divider />

      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={140} />
        </Box>
      ) : !data || data.lots.length === 0 ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 5, px: 2 }}>
          <Iconify icon="mdi:cash-remove" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', textAlign: 'center' }}>
            No realized gains yet. Sell transactions matched against your buy history will appear here.
          </Typography>
        </Stack>
      ) : (
        <>
          {summary && (
            <Stack
              direction="row"
              spacing={3}
              useFlexGap
              sx={{ flexWrap: 'wrap', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                  Net Gain/Loss
                </Typography>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: gainColor(summary.gain) }}>
                  {signed(summary.gain)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                  Short-term
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: gainColor(summary.shortTermGain) }}>
                  {signed(summary.shortTermGain)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                  Long-term
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: gainColor(summary.longTermGain) }}>
                  {signed(summary.longTermGain)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                  Proceeds
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{fnCurrency(summary.proceeds)}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                  Sales
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600 }}>{summary.count}</Typography>
              </Box>
            </Stack>
          )}

          <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Symbol</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Sold</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Qty
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Proceeds
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Cost
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Gain/Loss
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Term
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lots.map((l, i) => (
                  <TableRow key={`${l.symbol}-${l.soldDate}-${i}`} hover>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{l.symbol}</TableCell>
                    <TableCell sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>
                      {moment(l.soldDate).format('MMM D, YYYY')}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {l.qty}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {fnCurrency(l.proceeds)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {fnCurrency(l.costBasis)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: gainColor(l.gain),
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {signed(l.gain)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={l.term === 'long' ? 'Long' : 'Short'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          bgcolor: l.term === 'long' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                          color: l.term === 'long' ? '#22c55e' : '#f59e0b',
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {data.unmatchedSells > 0 && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', px: 2, py: 1 }}>
              {data.unmatchedSells} sale(s) had insufficient buy history to compute cost basis and were excluded. Import
              full transaction history for accurate figures.
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}
