import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

import { BRAND, RADIUS } from '@/components/ThemeRegistry/tokens';

/**
 * The product mark: a rounded gradient tile carrying a white trend line.
 * `public/favicon.svg` is the same artwork — changing one requires changing
 * the other.
 */
export default function BrandMark({ size = 30, sx }: { size?: number; sx?: SxProps<Theme> }) {
  const glyph = size * 0.6;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${size >= 28 ? RADIUS.md : RADIUS.sm}px`,
        background: BRAND.gradient,
        boxShadow: BRAND.glow,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        ...sx,
      }}
    >
      <Box
        component="svg"
        width={glyph}
        height={glyph}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        sx={{ display: 'block' }}
      >
        <path
          d="M2 17 C4.5 13.5 7 12 9.5 13 C12 14 14.5 9 20 5 L20 20 L2 20 Z"
          fill="rgba(255,255,255,0.22)"
        />
        <path
          d="M2 17 C4.5 13.5 7 12 9.5 13 C12 14 14.5 9 20 5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="5" r="2.5" fill="white" />
      </Box>
    </Box>
  );
}
