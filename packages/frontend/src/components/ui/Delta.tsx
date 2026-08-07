import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';
import { FONT_SIZE, RADIUS } from '@/components/ThemeRegistry/tokens';
import { fnCurrency, fnPercent, fnShortenCurrency } from '@/utils/formatNumber';

import { useSentiment } from './useSentiment';

type DeltaFormat = 'percent' | 'currency' | 'compactCurrency' | 'number' | 'none';

const FORMATTERS: Record<DeltaFormat, (v: number) => string> = {
  percent: fnPercent,
  currency: fnCurrency,
  compactCurrency: fnShortenCurrency,
  number: (v) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
  none: String,
};

type DeltaProps = {
  /** Drives both the sentiment colour and, unless `display` is set, the label. */
  value: number | null | undefined;
  format?: DeltaFormat;
  /** Overrides the rendered text while `value` still drives the colour. */
  display?: string;
  variant?: 'text' | 'chip';
  size?: 'micro' | 'small' | 'medium' | 'large';
  /** The direction glyph is what makes this readable without colour. */
  showIcon?: boolean;
  showSign?: boolean;
  sx?: SxProps<Theme>;
};

const SIZES = {
  micro: { font: FONT_SIZE.micro, icon: 11, gap: 0.25, px: 0.5, py: 0.125 },
  small: { font: FONT_SIZE.xs, icon: 13, gap: 0.375, px: 0.625, py: 0.25 },
  medium: { font: FONT_SIZE.sm, icon: 15, gap: 0.5, px: 0.75, py: 0.25 },
  large: { font: FONT_SIZE.lg, icon: 19, gap: 0.625, px: 1, py: 0.375 },
} as const;

/**
 * The app's single representation of a gain/loss figure. Always renders a
 * direction glyph alongside the colour so the value survives a greyscale
 * screenshot or a red/green colour deficiency.
 */
export default function Delta({
  value,
  format = 'percent',
  display,
  variant = 'text',
  size = 'small',
  showIcon = true,
  showSign = true,
  sx,
}: DeltaProps) {
  const tone = useSentiment(value);
  const dim = SIZES[size];

  const numeric = value ?? 0;
  const sign = showSign && tone.sentiment === 'up' ? '+' : '';
  const text = display ?? `${sign}${FORMATTERS[format](numeric)}`;

  const label = (
    <>
      {showIcon && <Iconify icon={tone.glyph} width={dim.icon} sx={{ flexShrink: 0 }} aria-hidden />}
      <Typography
        component="span"
        data-numeric=""
        sx={{ fontSize: dim.font, fontWeight: 650, color: 'inherit', lineHeight: 1.3, whiteSpace: 'nowrap' }}
      >
        {text}
      </Typography>
    </>
  );

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dim.gap,
        color: tone.main,
        ...(variant === 'chip' && {
          bgcolor: tone.bg,
          border: `1px solid ${tone.border}`,
          borderRadius: `${RADIUS.sm}px`,
          px: dim.px,
          py: dim.py,
        }),
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}
