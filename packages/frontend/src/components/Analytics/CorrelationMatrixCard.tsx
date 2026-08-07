import { Box, Card, Divider, LinearProgress, Skeleton, Stack, Tooltip, Typography } from '@mui/material';

import type { CorrelationMatrix } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';

type Props = {
  data: CorrelationMatrix | null;
  isLoading: boolean;
};

// High positive correlation (assets move together) reads red — it is concentration
// risk. Low or negative correlation reads green — genuine diversification.
const cellStyle = (value: number, diagonal: boolean) => {
  if (diagonal) return { bgcolor: 'action.hover', color: 'text.disabled' };
  const alpha = Math.min(0.85, 0.12 + Math.abs(value) * 0.7);
  const concentrated = value >= 0;
  return {
    bgcolor: concentrated ? `rgba(239,68,68,${alpha})` : `rgba(34,197,94,${alpha})`,
    color: alpha > 0.5 ? '#fff' : 'text.primary',
  };
};

const scoreColor = (score: number) => (score >= 66 ? 'var(--pd-up)' : score >= 40 ? 'var(--pd-warn)' : 'var(--pd-down)');

export default function CorrelationMatrixCard({ data, isLoading }: Props) {
  const hasData = data && data.symbols.length >= 2;

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="mdi:grid" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Diversification &amp; Correlation
        </Typography>
      </Stack>
      <Divider />

      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={200} />
        </Box>
      ) : !hasData ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 5, px: 2 }}>
          <Iconify icon="mdi:grid-off" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', textAlign: 'center' }}>
            Need at least two holdings with sufficient price history to compute correlations. Crypto and thinly-traded
            symbols may be excluded.
          </Typography>
        </Stack>
      ) : (
        <>
          <Stack sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }} spacing={1}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase' }}>
                Diversification Score
              </Typography>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: scoreColor(data.diversificationScore) }}>
                {data.diversificationScore}/100
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={data.diversificationScore}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { bgcolor: scoreColor(data.diversificationScore) },
              }}
            />
            <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap', pt: 0.5 }}>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                Avg correlation <strong>{data.avgCorrelation.toFixed(2)}</strong>
              </Typography>
              {data.mostCorrelated && (
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Most correlated{' '}
                  <strong style={{ color: 'var(--pd-down)' }}>
                    {data.mostCorrelated.a}/{data.mostCorrelated.b} {data.mostCorrelated.value.toFixed(2)}
                  </strong>
                </Typography>
              )}
              {data.leastCorrelated && (
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  Least correlated{' '}
                  <strong style={{ color: 'var(--pd-up)' }}>
                    {data.leastCorrelated.a}/{data.leastCorrelated.b} {data.leastCorrelated.value.toFixed(2)}
                  </strong>
                </Typography>
              )}
            </Stack>
          </Stack>

          <Box sx={{ overflowX: 'auto', p: 2 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `48px repeat(${data.symbols.length}, minmax(38px, 1fr))`,
                gap: '2px',
                minWidth: 44 * (data.symbols.length + 1),
              }}
            >
              <Box />
              {data.symbols.map((s) => (
                <Typography
                  key={`h-${s}`}
                  sx={{ fontSize: '0.58rem', color: 'text.disabled', textAlign: 'center', fontWeight: 700 }}
                >
                  {s}
                </Typography>
              ))}

              {data.symbols.map((rowSym, i) => (
                <Box key={`r-${rowSym}`} sx={{ display: 'contents' }}>
                  <Typography
                    sx={{ fontSize: '0.58rem', color: 'text.disabled', fontWeight: 700, alignSelf: 'center' }}
                  >
                    {rowSym}
                  </Typography>
                  {data.symbols.map((colSym, j) => {
                    const value = data.matrix[i][j];
                    return (
                      <Tooltip key={`c-${rowSym}-${colSym}`} title={`${rowSym} / ${colSym}: ${value.toFixed(2)}`}>
                        <Box
                          sx={{
                            ...cellStyle(value, i === j),
                            borderRadius: 0.5,
                            py: 0.6,
                            textAlign: 'center',
                            fontSize: '0.56rem',
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {value.toFixed(2)}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>

          {data.skipped.length > 0 && (
            <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', px: 2, py: 1 }}>
              Excluded (insufficient price history): {data.skipped.join(', ')}
            </Typography>
          )}
        </>
      )}
    </Card>
  );
}
