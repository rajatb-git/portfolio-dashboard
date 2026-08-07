import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { FONT_SIZE, RADIUS, SENTIMENT } from '@/components/ThemeRegistry/tokens';

export type AnalystCounts = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

type AnalystBarProps = {
  counts: AnalystCounts;
  width?: number;
  /** Hides the consensus word, leaving just the bar and the analyst count. */
  compact?: boolean;
};

/**
 * Analyst coverage as a single stacked bar.
 *
 * The previous treatment was five 24px count bubbles, which wrapped onto a
 * second line in a narrow column and made the reader do arithmetic to see the
 * balance. A proportional bar answers "how bullish is the street on this?" at a
 * glance, in fixed width, and the exact counts stay one hover away.
 */
export default function AnalystBar({ counts, width = 104, compact }: AnalystBarProps) {
  const theme = useTheme();
  const mode = theme.palette.mode === 'light' ? 'light' : 'dark';
  const s = SENTIMENT[mode];

  const total = counts.strongBuy + counts.buy + counts.hold + counts.sell + counts.strongSell;
  if (!total) return <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>—</Typography>;

  const segments = [
    { key: 'Strong buy', value: counts.strongBuy, color: s.up.main },
    { key: 'Buy', value: counts.buy, color: s.up.bg.replace(/[\d.]+\)$/, '0.55)') },
    { key: 'Hold', value: counts.hold, color: s.flat.main },
    { key: 'Sell', value: counts.sell, color: s.down.bg.replace(/[\d.]+\)$/, '0.55)') },
    { key: 'Strong sell', value: counts.strongSell, color: s.down.main },
  ].filter((seg) => seg.value > 0);

  const bullish = counts.strongBuy + counts.buy;
  const bearish = counts.sell + counts.strongSell;
  const consensus = bullish / total >= 0.5 ? 'Buy' : bearish / total >= 0.4 ? 'Sell' : 'Hold';
  const consensusColor = consensus === 'Buy' ? s.up.main : consensus === 'Sell' ? s.down.main : s.flat.main;

  const breakdown = (
    <Stack spacing={0.25} sx={{ py: 0.25 }}>
      <Typography sx={{ fontSize: FONT_SIZE.xs, fontWeight: 700 }}>
        {total} analyst{total === 1 ? '' : 's'} · consensus {consensus}
      </Typography>
      {[
        ['Strong buy', counts.strongBuy],
        ['Buy', counts.buy],
        ['Hold', counts.hold],
        ['Sell', counts.sell],
        ['Strong sell', counts.strongSell],
      ].map(([label, value]) => (
        <Typography key={label as string} sx={{ fontSize: FONT_SIZE.micro, opacity: 0.85 }}>
          {label}: {value}
        </Typography>
      ))}
    </Stack>
  );

  return (
    <Tooltip title={breakdown}>
      <Stack
        direction="row"
        spacing={0.875}
        sx={{ alignItems: 'center', width: 'fit-content' }}
        role="img"
        aria-label={`Analyst consensus ${consensus} from ${total} analysts: ${counts.strongBuy} strong buy, ${counts.buy} buy, ${counts.hold} hold, ${counts.sell} sell, ${counts.strongSell} strong sell`}
      >
        <Box
          aria-hidden
          sx={{
            display: 'flex',
            width,
            height: 6,
            borderRadius: `${RADIUS.pill}px`,
            overflow: 'hidden',
            flexShrink: 0,
            bgcolor: 'action.hover',
          }}
        >
          {segments.map((seg) => (
            <Box key={seg.key} sx={{ width: `${(seg.value / total) * 100}%`, bgcolor: seg.color }} />
          ))}
        </Box>

        {!compact && (
          <Typography sx={{ fontSize: FONT_SIZE.micro, fontWeight: 700, color: consensusColor, whiteSpace: 'nowrap' }}>
            {consensus}
          </Typography>
        )}
        <Typography data-numeric="" sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
          {total}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
