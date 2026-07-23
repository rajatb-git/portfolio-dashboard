import { Box, Card, Divider, Skeleton, Stack, Typography } from '@mui/material';

import type { MonthlyReturns } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';

type Props = {
  data: MonthlyReturns | null;
  isLoading: boolean;
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Alpha scales with magnitude relative to the largest swing so a flat month reads
// faint and an outlier reads saturated.
const cellStyle = (value: number | null, maxAbs: number) => {
  if (value === null) return { bgcolor: 'transparent', color: 'text.disabled' };
  const alpha = maxAbs > 0 ? Math.min(0.85, 0.15 + (Math.abs(value) / maxAbs) * 0.7) : 0.15;
  const positive = value >= 0;
  return {
    bgcolor: positive ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`,
    color: alpha > 0.5 ? '#fff' : positive ? '#16a34a' : '#dc2626',
  };
};

export default function MonthlyReturnsCard({ data, isLoading }: Props) {
  const hasData = data && data.months.length > 0 && data.firstYear !== null && data.lastYear !== null;

  const years = hasData
    ? Array.from(
        { length: (data.lastYear as number) - (data.firstYear as number) + 1 },
        (_, i) => (data.firstYear as number) + i
      )
    : [];
  const lookup = new Map<string, number | null>();
  const maxAbs = data ? data.months.reduce((m, r) => (r.return !== null ? Math.max(m, Math.abs(r.return)) : m), 0) : 0;
  if (data) for (const r of data.months) lookup.set(`${r.year}-${r.month}`, r.return);
  const yearTotal = new Map<number, number>();
  if (data) for (const y of data.yearlyReturns) yearTotal.set(y.year, y.return);

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="mdi:calendar-month" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Monthly Returns
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {hasData && data.bestMonth && data.worstMonth && (
          <Stack direction="row" spacing={2}>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
              Best <strong style={{ color: '#22c55e' }}>+{data.bestMonth.return}%</strong>
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
              Worst <strong style={{ color: '#ef4444' }}>{data.worstMonth.return}%</strong>
            </Typography>
          </Stack>
        )}
      </Stack>
      <Divider />

      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={140} />
        </Box>
      ) : !hasData ? (
        <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 5, px: 2 }}>
          <Iconify icon="mdi:calendar-blank" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', textAlign: 'center' }}>
            Not enough snapshot history yet. Month-over-month returns build up as daily portfolio values are recorded.
          </Typography>
        </Stack>
      ) : (
        <Box sx={{ overflowX: 'auto', p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: `44px repeat(12, 1fr) 56px`, gap: '3px', minWidth: 640 }}>
            <Box />
            {MONTH_LABELS.map((m) => (
              <Typography
                key={m}
                sx={{ fontSize: '0.62rem', color: 'text.disabled', textAlign: 'center', fontWeight: 600 }}
              >
                {m}
              </Typography>
            ))}
            <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', textAlign: 'center', fontWeight: 700 }}>
              Year
            </Typography>

            {years.map((year) => (
              <Box key={year} sx={{ display: 'contents' }}>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 700, alignSelf: 'center' }}>
                  {year}
                </Typography>
                {MONTH_LABELS.map((_, i) => {
                  const value = lookup.has(`${year}-${i + 1}`)
                    ? (lookup.get(`${year}-${i + 1}`) as number | null)
                    : null;
                  const style = cellStyle(value, maxAbs);
                  return (
                    <Box
                      key={`${year}-${i}`}
                      sx={{
                        ...style,
                        borderRadius: 0.75,
                        py: 0.6,
                        textAlign: 'center',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {value === null ? '·' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}`}
                    </Box>
                  );
                })}
                <Box
                  sx={{
                    borderRadius: 0.75,
                    py: 0.6,
                    textAlign: 'center',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: (yearTotal.get(year) ?? 0) >= 0 ? '#22c55e' : '#ef4444',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {yearTotal.has(year)
                    ? `${(yearTotal.get(year) as number) >= 0 ? '+' : ''}${(yearTotal.get(year) as number).toFixed(1)}`
                    : '·'}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Card>
  );
}
