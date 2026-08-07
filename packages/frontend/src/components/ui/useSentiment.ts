import { useTheme } from '@mui/material/styles';

import { type Sentiment, SENTIMENT, SENTIMENT_GLYPH, sentimentOf } from '@/components/ThemeRegistry/tokens';

export type SentimentPalette = {
  main: string;
  dim: string;
  bg: string;
  border: string;
  glyph: string;
  sentiment: Sentiment;
};

/**
 * Resolves a numeric change into the mode-correct gain/loss colours plus the
 * direction glyph that has to accompany them — colour alone is not an
 * accessible signal.
 */
export function useSentiment(value: number | null | undefined, epsilon = 0): SentimentPalette {
  const theme = useTheme();
  const mode = theme.palette.mode === 'light' ? 'light' : 'dark';
  const sentiment = sentimentOf(value, epsilon);
  return { ...SENTIMENT[mode][sentiment], glyph: SENTIMENT_GLYPH[sentiment], sentiment };
}

export { sentimentOf };
export type { Sentiment };
