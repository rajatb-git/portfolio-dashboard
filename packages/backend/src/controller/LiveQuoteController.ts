import moment from 'moment';
import { getQuoteForSymbol } from '../externalApis/finnHub';
import { type ExtendedQuote, getQuoteFromNasdaq, type NasdaqQuote } from '../externalApis/nasdaq';
import type { QuoteResponse } from '../externalApis/types';
import { IPriceStoreModel, PriceStoreDBModel } from '../models/PriceStoreModel';
import { getMarketSession, isExtendedHoursSession } from '../utils/marketCalendar';

const priceStoreModel = PriceStoreDBModel();
const priceStoreReady = priceStoreModel.initialize();

// Dedupes concurrent refreshes for the same symbol. The dashboard builds a new
// controller per request, so this is kept at module scope to be shared across them.
const inFlightRefreshes = new Map<string, Promise<IPriceStoreModel>>();

export class LiveQuoteController {
  getLiveQuote = async (symbol: string, isCrypto = false): Promise<IPriceStoreModel> => {
    // Ensure the on-disk price cache has finished loading before querying it.
    await priceStoreReady;
    const dbFetch = priceStoreModel.findById(symbol);

    // No cached price yet — fetch once (blocking) so the holding can be priced at all.
    if (!dbFetch) {
      return this.refreshQuote(symbol, isCrypto);
    }

    // Stale-while-revalidate: when the cached quote is stale, kick off a background
    // refresh but return the cached value immediately. The dashboard must never block
    // on live quote APIs — Finnhub rate-limits and the NASDAQ ETF fallback makes several
    // slow sequential calls per symbol, which made first loads take ~10s and drop any
    // holding whose refresh failed. Returning the cached value keeps loads fast and
    // complete; the refreshed price is picked up on the next poll.
    if (this.liveFetchRequiredQuote(dbFetch)) {
      void this.refreshQuote(symbol, isCrypto).catch(() => {});
    }

    return dbFetch;
  };

  private refreshQuote = (symbol: string, isCrypto: boolean): Promise<IPriceStoreModel> => {
    const existing = inFlightRefreshes.get(symbol);
    if (existing) return existing;

    const promise = this.fetchAndStore(symbol, isCrypto).finally(() => {
      inFlightRefreshes.delete(symbol);
    });
    inFlightRefreshes.set(symbol, promise);
    return promise;
  };

  private fetchAndStore = async (symbol: string, isCrypto: boolean): Promise<IPriceStoreModel> => {
    const inExtendedHours = !isCrypto && isExtendedHoursSession();

    let apiFetch: QuoteResponse | NasdaqQuote;
    if (inExtendedHours) {
      // Finnhub's REST /quote only ever reports the regular session, so during
      // pre-/post-market source from NASDAQ, which splits the last regular close
      // from the live extended-hours print. Fall back to Finnhub if NASDAQ can't
      // price the symbol — that costs the extended figures, not the quote itself.
      try {
        apiFetch = await getQuoteFromNasdaq(symbol);
      } catch {
        apiFetch = await getQuoteForSymbol(symbol, isCrypto);
      }
    } else {
      apiFetch = await getQuoteForSymbol(symbol, isCrypto);

      // Finnhub's free tier returns c=0 for symbols it doesn't cover (notably most US ETFs).
      // Fall back to NASDAQ; if that also can't price the symbol it throws and the dashboard
      // skips this holding rather than caching a zero.
      if (!isCrypto && (!apiFetch.c || apiFetch.c <= 0)) {
        apiFetch = await getQuoteFromNasdaq(symbol);
      }
    }

    const extended: ExtendedQuote | null = ('extended' in apiFetch && apiFetch.extended) || null;

    const record = {
      price: apiFetch.c,
      percentChange: apiFetch.dp,
      change: apiFetch.d,
      dayHigh: apiFetch.h,
      dayLow: apiFetch.l,
      open: apiFetch.o,
      prevClose: apiFetch.pc,
      priceDate: moment.unix(apiFetch.t).toISOString(),
      // Always written, so yesterday's after-hours print is cleared the moment a
      // regular-session quote replaces it rather than lingering as "live".
      extendedPrice: extended?.price ?? 0,
      extendedChange: extended?.change ?? 0,
      extendedPercentChange: extended?.percentChange ?? 0,
      extendedSession: extended?.session ?? '',
      extendedAt: extended?.asOf ?? '',
    };

    const existing = priceStoreModel.findById(symbol);
    return existing ? priceStoreModel.updateById(symbol, record) : priceStoreModel.insertOne(record, symbol);
  };

  liveFetchRequiredQuote = (dbFetch: IPriceStoreModel | undefined): boolean => {
    if (!dbFetch) return true;

    // Refresh on a 120s cadence through both the regular session and the pre-/post-market
    // windows so extended-hours prices keep tracking live, not just 9:30–16:00. The market
    // calendar also keeps this quiet on weekends and holidays.
    if (getMarketSession() !== 'closed') {
      return moment().diff(moment(dbFetch.updatedAt), 'seconds') >= 120;
    }

    // Derive current time in ET so the close comparison below is timezone-correct.
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

    // Outside all trading hours: refresh if cache was last updated before the most recent
    // market close, so a quote stored on a previous trading day doesn't persist indefinitely.
    const updatedAtEt = new Date(new Date(dbFetch.updatedAt).toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return updatedAtEt < this.mostRecentMarketCloseEt(etNow);
  };

  mostRecentMarketCloseEt = (etNow: Date): Date => {
    const close = new Date(etNow.getFullYear(), etNow.getMonth(), etNow.getDate(), 16, 0, 0, 0);
    if (close > etNow) close.setDate(close.getDate() - 1);
    while (close.getDay() === 0 || close.getDay() === 6) close.setDate(close.getDate() - 1);
    return close;
  };
}
