import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/Iconify';
import { fnCurrency, fnPercent } from '@/utils/formatNumber';

import { Total } from './DashboardTable/dashTableUtils';

type TotalCardProps = {
  total: Total;
};

export default function TotalCard({ total }: TotalCardProps) {
  const isPositive = total.totalGL > 0;

  const borderColor = isPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
  const glowColor = isPositive ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';
  const accentColor = isPositive ? '#4ade80' : '#f87171';
  const dimAccent = isPositive ? '#86efac' : '#fca5a5';

  return (
    <Card
      sx={{
        p: 1.5,
        background: isPositive
          ? 'linear-gradient(135deg, rgba(22,101,52,0.55) 0%, rgba(15,60,35,0.4) 100%)'
          : 'linear-gradient(135deg, rgba(127,29,29,0.55) 0%, rgba(80,10,10,0.4) 100%)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 4px 20px ${glowColor}, 0 1px 3px rgba(0,0,0,0.4)`,
      }}
    >
      <Stack direction="column" spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="column" spacing={0}>
            <Typography
              sx={{
                fontSize: '0.62rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: dimAccent,
                opacity: 0.8,
              }}
            >
              {total.accountId}
            </Typography>
            <Typography
              sx={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: accentColor,
                lineHeight: 1.2,
                mt: 0.25,
              }}
            >
              {total.totalGL > 0 ? '+' : ''}
              {fnCurrency(total.totalGL)}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{
              bgcolor: isPositive ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)',
              border: `1px solid ${borderColor}`,
              borderRadius: '6px',
              px: 0.75,
              py: 0.4,
            }}
          >
            <Iconify
              icon={isPositive ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
              width={13}
              sx={{ color: accentColor }}
            />
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: accentColor }}>
              {total.percentGL > 0 ? '+' : ''}
              {fnPercent(total.percentGL)}
            </Typography>
          </Stack>
        </Stack>

        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ borderTop: `1px solid ${borderColor}`, pt: 1 }}
        >
          <Stack direction="column" spacing={0}>
            <Typography sx={{ fontSize: '0.62rem', color: dimAccent, opacity: 0.7, fontWeight: 500 }}>
              Invested
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {fnCurrency(total.totalInvestment)}
            </Typography>
          </Stack>

          <Stack direction="column" spacing={0} alignItems="flex-end">
            <Typography sx={{ fontSize: '0.62rem', color: dimAccent, opacity: 0.7, fontWeight: 500 }}>
              Value
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {fnCurrency(total.totalValue)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
