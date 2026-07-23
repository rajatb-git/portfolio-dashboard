import {
  Box,
  Card,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';

import type { TaxLossHarvesting } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  data: TaxLossHarvesting | null;
  isLoading: boolean;
};

const loss = (v: number) => `-${fnCurrency(Math.abs(v))}`;

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

export default function TaxLossHarvestingCard({ data, isLoading }: Props) {
  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="mdi:scissors-cutting" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Tax-Loss Harvesting
        </Typography>
      </Stack>
      <Divider />

      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={140} />
        </Box>
      ) : !data || data.candidates.length === 0 ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 5, px: 2 }}>
          <Iconify icon="mdi:emoticon-happy-outline" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', textAlign: 'center' }}>
            No positions are currently at a loss. Holdings trading below your cost basis would appear here as candidates
            to realize a loss against your gains.
          </Typography>
        </Stack>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={3}
            useFlexGap
            sx={{ flexWrap: 'wrap', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Metric label="Harvestable Now" value={loss(data.harvestableNow)} color="#ef4444" />
            <Metric label="Total Unrealized Loss" value={loss(data.totalUnrealizedLoss)} color="#ef4444" />
            <Metric label="Short-term" value={loss(data.shortTermLoss)} />
            <Metric label="Long-term" value={loss(data.longTermLoss)} />
          </Stack>

          <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Symbol</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Market Value
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Unrealized Loss
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Loss %
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Term
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.candidates.map((c) => (
                  <TableRow key={`${c.accountId}-${c.symbol}`} hover>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{c.symbol}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
                      {fnCurrency(c.marketValue)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#ef4444',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {loss(c.unrealizedLoss)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontSize: '0.78rem', color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {c.lossPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={c.term === 'long' ? 'Long' : 'Short'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 600,
                          bgcolor: c.term === 'long' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                          color: c.term === 'long' ? '#22c55e' : '#f59e0b',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {c.washSaleRisk ? (
                        <Tooltip
                          title={`Recent purchase — selling now may trigger the wash-sale rule. Clear after ${
                            c.washSaleClearDate
                              ? moment(c.washSaleClearDate).format('MMM D, YYYY')
                              : 'the 30-day window'
                          }.`}
                        >
                          <Chip
                            icon={<Iconify icon="mdi:alert" width={12} />}
                            label="Wash-sale risk"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.62rem',
                              fontWeight: 600,
                              bgcolor: 'rgba(239,68,68,0.12)',
                              color: '#ef4444',
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Clear"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            bgcolor: 'rgba(34,197,94,0.12)',
                            color: '#22c55e',
                          }}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', px: 2, py: 1 }}>
            Holding periods and wash-sale flags are estimated from your recorded buy history. Not tax advice — confirm
            with your broker's cost-basis records before selling.
          </Typography>
        </>
      )}
    </Card>
  );
}
