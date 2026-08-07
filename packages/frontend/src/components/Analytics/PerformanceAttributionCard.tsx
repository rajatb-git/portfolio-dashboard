import * as React from 'react';
import {
  Box,
  Card,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

type HoldingAttribution = {
  symbol: string;
  name: string;
  accountId: string;
  type: string;
  totalGL: number;
  totalGLPercent: number;
  marketValue: number;
  portfolioWeight: number;
  contributionToReturn: number;
  dayGL: number;
};

type PerformanceAttribution = {
  holdings: HoldingAttribution[];
  totalPortfolioValue: number;
  totalGL: number;
  totalGLPercent: number;
  dayGL: number;
  dayGLPercent: number;
};

type Props = { attribution: PerformanceAttribution | null; isLoading: boolean };

export default function PerformanceAttributionCard({ attribution, isLoading }: Props) {
  const [view, setView] = React.useState<'total' | 'day'>('total');

  const rows = attribution?.holdings ?? [];
  const sorted = [...rows].sort((a, b) =>
    view === 'total' ? b.contributionToReturn - a.contributionToReturn : b.dayGL - a.dayGL
  );

  const maxAbsContrib = sorted.reduce(
    (m, r) => Math.max(m, Math.abs(view === 'total' ? r.contributionToReturn : r.dayGL)),
    0.01
  );

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Iconify icon="tabler:chart-bar" width={16} sx={{ color: '#3b82f6' }} />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Performance Attribution
          </Typography>
        </Stack>
        <ToggleButtonGroup
          size="small"
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="total" sx={{ px: 1.5, fontSize: '0.72rem' }}>
            All-Time
          </ToggleButton>
          <ToggleButton value="day" sx={{ px: 1.5, fontSize: '0.72rem' }}>
            Today
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {attribution && (
        <Stack direction="row" spacing={3} sx={{ px: 2, pb: 1 }}>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>
              {view === 'total' ? 'Total G/L' : "Today's G/L"}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color:
                  view === 'total'
                    ? attribution.totalGL >= 0
                      ? 'var(--pd-up)'
                      : 'var(--pd-down)'
                    : attribution.dayGL >= 0
                      ? 'var(--pd-up)'
                      : 'var(--pd-down)',
              }}
            >
              {fnCurrency(view === 'total' ? attribution.totalGL : attribution.dayGL)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>Return</Typography>
            <Typography
              sx={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color:
                  view === 'total'
                    ? attribution.totalGLPercent >= 0
                      ? 'var(--pd-up)'
                      : 'var(--pd-down)'
                    : attribution.dayGLPercent >= 0
                      ? 'var(--pd-up)'
                      : 'var(--pd-down)',
              }}
            >
              {(view === 'total' ? attribution.totalGLPercent : attribution.dayGLPercent).toFixed(2)}%
            </Typography>
          </Box>
        </Stack>
      )}

      <Divider />

      {isLoading ? (
        <Stack spacing={1} sx={{ p: 2 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={28} />
          ))}
        </Stack>
      ) : !attribution || rows.length === 0 ? (
        <Stack sx={{ alignItems: 'center', p: 3 }}>
          <Typography sx={{ color: 'text.disabled', fontSize: '0.82rem' }}>
            No holdings data available.
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Symbol', 'Weight', view === 'total' ? 'Contribution' : "Today's G/L", 'G/L %', 'Bar'].map(
                  (h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontSize: '0.68rem',
                        color: 'text.disabled',
                        fontWeight: 700,
                        py: 0.75,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((r) => {
                const val = view === 'total' ? r.contributionToReturn : r.dayGL;
                const glPct =
                  view === 'total'
                    ? r.totalGLPercent
                    : r.marketValue > 0
                      ? (r.dayGL / r.marketValue) * 100
                      : 0;
                const isPos = val >= 0;
                const barWidth = (Math.abs(val) / maxAbsContrib) * 100;
                return (
                  <TableRow key={`${r.symbol}-${r.accountId}`} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{r.symbol}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {r.portfolioWeight.toFixed(1)}%
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.78rem',
                        color: isPos ? 'var(--pd-up)' : 'var(--pd-down)',
                        fontWeight: 600,
                      }}
                    >
                      {isPos ? '+' : ''}
                      {view === 'total' ? `${val.toFixed(2)}%` : fnCurrency(val)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: glPct >= 0 ? 'var(--pd-up)' : 'var(--pd-down)' }}>
                      {glPct >= 0 ? '+' : ''}
                      {glPct.toFixed(2)}%
                    </TableCell>
                    <TableCell sx={{ minWidth: 80 }}>
                      <Box
                        sx={{
                          position: 'relative',
                          height: 8,
                          bgcolor: 'action.hover',
                          borderRadius: 2,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${barWidth}%`,
                            bgcolor: isPos ? 'var(--pd-up)' : 'var(--pd-down)',
                            borderRadius: 2,
                            transition: 'width 0.3s',
                          }}
                        />
                      </Box>
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
