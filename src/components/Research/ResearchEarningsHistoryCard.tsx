import { Box, Card, Chip, Divider, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

type EarningsEntry = {
  period: string;
  quarter: number;
  year: number;
  epsEstimate: number | null;
  epsActual: number | null;
  surprisePercent: number | null;
};

type Props = {
  history: any[];
  isLoading: boolean;
};

function formatEps(v: number | null): string {
  if (v == null) return '—';
  return `$${v.toFixed(2)}`;
}

export default function ResearchEarningsHistoryCard({ history, isLoading }: Props) {
  const rows: EarningsEntry[] = (history ?? []).slice(0, 4).map((e: any) => ({
    period: e.period ?? e.date ?? '—',
    quarter: e.quarter,
    year: e.year,
    epsEstimate: e.estimate ?? null,
    epsActual: e.actual ?? null,
    surprisePercent: e.surprisePercent ?? null,
  }));

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
        EPS History (Last 4 Quarters)
      </Typography>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={120} sx={{ m: 2, borderRadius: 1 }} />
      ) : rows.length === 0 ? (
        <Typography sx={{ p: 2, fontSize: '0.78rem', color: 'text.disabled' }}>No earnings history found.</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Period', 'EPS Est.', 'EPS Actual', 'Surprise'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{ fontSize: '0.68rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const beat = row.surprisePercent != null && row.surprisePercent >= 0;
                return (
                  <TableRow key={row.period} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {row.period}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {formatEps(row.epsEstimate)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {formatEps(row.epsActual)}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {row.surprisePercent != null ? (
                        <Chip
                          label={`${beat ? '+' : ''}${row.surprisePercent.toFixed(1)}%`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: beat ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                            color: beat ? '#4ade80' : '#f87171',
                            border: `1px solid ${beat ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>
                      )}
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
