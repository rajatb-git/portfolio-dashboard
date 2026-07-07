import moment from 'moment';
import { getQuoteForSymbol } from '../externalApis/finnHub';
import { getQuoteFromNasdaq } from '../externalApis/nasdaq';
import type { QuoteResponse } from '../externalApis/types';
import { IPriceStoreModel, PriceStoreDBModel } from '../models/PriceStoreModel';

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
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const inExtendedHours = !isCrypto && this.marketPhaseEt(etNow) === 'extended';

    let apiFetch: QuoteResponse;
    if (inExtendedHours) {
      // Finnhub's REST /quote only reflects the regular session, so during pre-/post-market
      // source from NASDAQ, whose lastSalePrice tracks extended-hours trades. Fall back to
      // Finnhub if NASDAQ can't price the symbol.
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

    const record = {
      price: apiFetch.c,
      percentChange: apiFetch.dp,
      change: apiFetch.d,
      dayHigh: apiFetch.h,
      dayLow: apiFetch.l,
      open: apiFetch.o,
      prevClose: apiFetch.pc,
      priceDate: moment.unix(apiFetch.t).toISOString(),
    };

    const existing = priceStoreModel.findById(symbol);
    return existing ? priceStoreModel.updateById(symbol, record) : priceStoreModel.insertOne(record, symbol);
  };

  // Classifies the ET wall-clock into a trading phase. Pre-market opens 4:00 ET,
  // the regular session runs 9:30–16:00, and after-hours trades until 20:00 ET.
  marketPhaseEt = (etNow: Date): 'regular' | 'extended' | 'closed' => {
    const day = etNow.getDay();
    if (day === 0 || day === 6) return 'closed';

    const minutes = etNow.getHours() * 60 + etNow.getMinutes();
    const preMarketOpen = 4 * 60;
    const regularOpen = 9 * 60 + 30;
    const regularClose = 16 * 60;
    const afterHoursClose = 20 * 60;

    if (minutes >= regularOpen && minutes < regularClose) return 'regular';
    if (minutes >= preMarketOpen && minutes < afterHoursClose) return 'extended';
    return 'closed';
  };

  liveFetchRequiredQuote = (dbFetch: IPriceStoreModel | undefined): boolean => {
    if (!dbFetch) return true;

    // Derive current time in ET so market-hours checks are timezone-correct.
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

    // Refresh on a 120s cadence through both the regular session and the pre-/post-market
    // windows so extended-hours prices keep tracking live, not just 9:30–16:00.
    if (this.marketPhaseEt(etNow) !== 'closed') {
      return moment().diff(moment(dbFetch.updatedAt), 'seconds') >= 120;
    }

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
