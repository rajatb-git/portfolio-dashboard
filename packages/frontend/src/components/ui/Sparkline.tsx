import * as React from 'react';

import Box from '@mui/material/Box';

import { useSentiment } from './useSentiment';

type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  /** Overrides the trend-derived colour. */
  color?: string;
  strokeWidth?: number;
  fill?: boolean;
  /** Screen-reader description; the shape itself carries no text. */
  label?: string;
};

/**
 * A decorative trend line — deliberately axis-free and unlabelled. It shows
 * shape only; any figure the user needs to read lives next to it as text.
 */
export default function Sparkline({
  data,
  width = 88,
  height = 26,
  color,
  strokeWidth = 1.5,
  fill = true,
  label,
}: SparklineProps) {
  const trend = (data.at(-1) ?? 0) - (data[0] ?? 0);
  const tone = useSentiment(trend);
  const stroke = color ?? tone.main;

  const { line, area } = React.useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = strokeWidth;

    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * (width - pad * 2) + pad;
      const y = height - pad - ((value - min) / span) * (height - pad * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    return {
      line: `M ${points.join(' L ')}`,
      area: `M ${points.join(' L ')} L ${width - pad},${height} L ${pad},${height} Z`,
    };
  }, [data, width, height, strokeWidth]);

  const gradientId = React.useId();

  if (!line) return <Box sx={{ width, height }} />;

  return (
    <Box
      component="svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      sx={{ display: 'block', overflow: 'visible' }}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Box>
  );
}
