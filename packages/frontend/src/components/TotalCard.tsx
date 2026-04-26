import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';
import { fnCurrency, fnPercent } from '@/utils/formatNumber';

import { Total } from './DashboardTable/dashTableUtils';

type TotalCardProps = {
  total: Total;
};

export default function TotalCard({ total }: TotalCardProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const isPositive = total.totalGL > 0;

  const borderColor = isPositive
    ? isLight ? 'rgba(22,163,74,0.3)' : 'rgba(34,197,94,0.25)'
    : isLight ? 'rgba(220,38,38,0.3)' : 'rgba(239,68,68,0.25)';
  const glowColor = isPositive
    ? isLight ? 'rgba(22,163,74,0.1)' : 'rgba(34,197,94,0.08)'
    : isLight ? 'rgba(220,38,38,0.1)' : 'rgba(239,68,68,0.08)';
  const accentColor = isPositive
    ? isLight ? '#15803d' : '#4ade80'
    : isLight ? '#dc2626' : '#f87171';
  const dimAccent = isPositive
    ? isLight ? '#166534' : '#86efac'
    : isLight ? '#991b1b' : '#fca5a5';

  const background = isPositive
    ? isLight
      ? 'linear-gradient(135deg, rgba(187,247,208,0.6) 0%, rgba(220,252,231,0.4) 100%)'
      : 'linear-gradient(135deg, rgba(22,101,52,0.55) 0%, rgba(15,60,35,0.4) 100%)'
    : isLight
      ? 'linear-gradient(135deg, rgba(254,202,202,0.6) 0%, rgba(254,226,226,0.4) 100%)'
      : 'linear-gradient(135deg, rgba(127,29,29,0.55) 0%, rgba(80,10,10,0.4) 100%)';

  const pillBg = isPositive
    ? isLight ? 'rgba(22,163,74,0.08)' : 'rgba(74,222,128,0.10)'
    : isLight ? 'rgba(220,38,38,0.08)' : 'rgba(248,113,113,0.10)';

  return (
    <Card
      sx={{
        p: 1.5,
        background,
        border: `1px solid ${borderColor}`,
        boxShadow: `0 4px 20px ${glowColor}, 0 1px 3px ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.4)'}`,
      }}
    >
      <Stack direction="column" spacing={1}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            spacing={0.5}
            sx={{
              alignItems: 'center',
              bgcolor: pillBg,
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
          sx={{ justifyContent: 'space-between', borderTop: `1px solid ${borderColor}`, pt: 1 }}
        >
          <Stack direction="column" spacing={0}>
            <Typography sx={{ fontSize: '0.62rem', color: dimAccent, opacity: 0.7, fontWeight: 500 }}>
              Invested
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary' }}>
              {fnCurrency(total.totalInvestment)}
            </Typography>
          </Stack>

          <Stack direction="column" spacing={0} sx={{ alignItems: 'flex-end' }}>
            <Typography sx={{ fontSize: '0.62rem', color: dimAccent, opacity: 0.7, fontWeight: 500 }}>
              Value
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary' }}>
              {fnCurrency(total.totalValue)}
            </Typography>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
