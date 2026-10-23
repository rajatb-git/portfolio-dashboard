import type { IRecommendation } from '../externalApis/finnHub';
import { type Quote, quoteKey } from './datasets';
import { type MarketRead, read } from './store';

export type { Quote };

export type QuoteRequest = { symbol: string; isCrypto: boolean };

// Stored quotes for many symbols at once, keyed by upper-cased symbol. Never
// waits on Finnhub; a symbol with nothing stored comes back `pending` and the
// scheduler fetches it next. A background job that would rather wait for those
// than skip them passes `waitForPendingMs`.
export const getCachedQuotes = async (
  requests: QuoteRequest[],
  options: { waitForPendingMs?: number } = {}
): Promise<Map<string, MarketRead<Quote>>> => {
  const unique = new Map<string, QuoteRequest>();
  for (const r of requests) {
    if (!r.symbol) continue;
    const symbol = r.symbol.toUpperCase();
    if (!unique.has(symbol)) unique.set(symbol, { symbol, isCrypto: r.isCrypto });
  }

  const reads = await Promise.all(
    [...unique.values()].map(async ({ symbol, isCrypto }) => {
      const key = quoteKey(symbol, isCrypto);
      let result = await read<Quote>('quote', key);
      if (result.pending && options.waitForPendingMs) {
        result = await read<Quote>('quote', key, {
          mode: 'fresh',
          lane: 'background',
          waitMs: options.waitForPendingMs,
        });
      }
      return [symbol, result] as const;
    })
  );
  return new Map(reads);
};

// One quote a user is waiting on: recent enough to show, fetched now if not
// (bounded by the store's deadline). Throws only when there is no price at all.
export const getQuote = async (
  symbol: string,
  isCrypto = false,
  options: { force?: boolean; view?: boolean } = {}
): Promise<Quote> => {
  const result = await read<Quote>('quote', quoteKey(symbol, isCrypto), {
    mode: options.force ? 'force' : 'fresh',
    view: options.view,
  });
  if (!result.value) throw new Error(result.error ?? `No price for ${symbol.toUpperCase()} yet — try again shortly`);
  return result.value;
};

export const getCachedRecommendation = (symbol: string): Promise<MarketRead<IRecommendation | null>> =>
  read<IRecommendation | null>('recommendation', symbol.toUpperCase());
