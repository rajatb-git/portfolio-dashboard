import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { FONT_SIZE, MOTION } from '@/components/ThemeRegistry/tokens';
import Delta from '@/components/ui/Delta';
import ToolbarButton from '@/components/ui/ToolbarButton';
import { useSentiment } from '@/components/ui/useSentiment';
import { fnCurrency } from '@/utils/formatNumber';

import { Total } from './DashboardTable/dashTableUtils';

type TotalCardProps = {
  total: Total;
  onManageCash?: (accountId: string) => void;
};

/**
 * One account's position. Sentiment is carried by a single accent rail and the
 * delta chip rather than by washing the whole card in green or red — a wall of
 * tinted cards makes the actual numbers harder to compare.
 */
export default function TotalCard({ total, onManageCash }: TotalCardProps) {
  const tone = useSentiment(total.totalGL);
  const cash = total.cashBalance ?? 0;
  const cashTone = useSentiment(cash < 0 ? -1 : 0);

  return (
    <Card
      sx={{
        position: 'relative',
        p: 1.5,
        pl: 1.75,
        height: '100%',
        transition: `border-color ${MOTION.fast} ${MOTION.easing}`,
        '&:hover': { borderColor: tone.border },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: tone.main,
          opacity: 0.85,
        }}
      />

      <Stack spacing={0.75}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            noWrap
            sx={{
              fontSize: FONT_SIZE.micro,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'text.secondary',
              minWidth: 0,
            }}
          >
            {total.accountName ?? total.accountId}
          </Typography>
          <Delta value={total.percentGL} format="percent" size="micro" variant="chip" />
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}>
          <Typography
            data-numeric=""
            noWrap
            sx={{ fontSize: '1.1875rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}
          >
            {fnCurrency(total.totalValue)}
          </Typography>
          <Typography data-numeric="" noWrap sx={{ fontSize: FONT_SIZE.xs, fontWeight: 650, color: tone.main }}>
            {total.totalGL > 0 ? '+' : ''}
            {fnCurrency(total.totalGL)}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 0.5, borderTop: 1, borderColor: 'divider' }}
        >
          <Typography noWrap sx={{ fontSize: FONT_SIZE.micro, color: 'text.secondary', minWidth: 0 }}>
            <Box component="span" sx={{ color: 'text.disabled' }}>
              Invested
            </Box>{' '}
            <Box component="span" data-numeric="" sx={{ fontWeight: 600 }}>
              {fnCurrency(total.totalInvestment)}
            </Box>
            <Box component="span" sx={{ opacity: 0.4, mx: 0.625 }}>
              ·
            </Box>
            <Box component="span" sx={{ color: 'text.disabled' }}>
              Cash
            </Box>{' '}
            <Box
              component="span"
              data-numeric=""
              sx={{ fontWeight: 600, color: cash < 0 ? cashTone.main : 'inherit' }}
            >
              {fnCurrency(cash)}
            </Box>
          </Typography>

          {onManageCash && (
            <ToolbarButton
              icon="tabler:cash"
              label={`Deposit or withdraw cash — ${total.accountName ?? total.accountId}`}
              onClick={() => onManageCash(total.accountId)}
              size={15}
              sx={{ p: 0.375, color: 'text.disabled' }}
            />
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
