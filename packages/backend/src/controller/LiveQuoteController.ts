import moment from 'moment';
import { getQuoteForSymbol } from '../externalApis/finnHub';
import { getQuoteFromNasdaq } from '../externalApis/nasdaq';
import { IPriceStoreModel, PriceStoreDBModel } from '../models/PriceStoreModel';

const priceStoreModel = PriceStoreDBModel();
const priceStoreReady = priceStoreModel.initialize();

export class LiveQuoteController {
  getLiveQuote = async (symbol: string, isCrypto = false): Promise<IPriceStoreModel> => {
    // Ensure the on-disk price cache has finished loading before querying it.
    // Otherwise a cold-start request reads an empty cache, refetches every symbol
    // live, and rate-limited failures drop holdings from the total.
    await priceStoreReady;
    const dbFetch = priceStoreModel.findById(symbol);

    if (this.liveFetchRequiredQuote(dbFetch)) {
      try {
        let apiFetch = await getQuoteForSymbol(symbol, isCrypto);

        // Finnhub's free tier returns c=0 for symbols it doesn't cover (notably most US ETFs).
        // Fall back to NASDAQ; if that also can't price the symbol it throws and the dashboard
        // skips this holding rather than caching a zero.
        if (!isCrypto && (!apiFetch.c || apiFetch.c <= 0)) {
          apiFetch = await getQuoteFromNasdaq(symbol);
        }

        const priceDate = moment.unix(apiFetch.t).toISOString();

        if (dbFetch) {
          return priceStoreModel.updateById(symbol, {
            price: apiFetch.c,
            percentChange: apiFetch.dp,
            change: apiFetch.d,
            dayHigh: apiFetch.h,
            dayLow: apiFetch.l,
            open: apiFetch.o,
            prevClose: apiFetch.pc,
            priceDate: priceDate,
          });
        } else {
          return priceStoreModel.insertOne(
            {
              price: apiFetch.c,
              percentChange: apiFetch.dp,
              change: apiFetch.d,
              dayHigh: apiFetch.h,
              dayLow: apiFetch.l,
              open: apiFetch.o,
              prevClose: apiFetch.pc,
              priceDate: priceDate,
            },
            symbol
          );
        }
      } catch (err) {
        // A live refresh failed — typically a rate-limit (429) or transient network
        // error when many symbols are fetched at once on a cold/stale cache. If we
        // already hold a previously cached quote, return that stale value instead of
        // throwing, so the holding still counts toward the total. Without this the
        // holding is dropped and the portfolio value reads low, only filling in over
        // the next few refreshes as the cache repopulates. Only rethrow when there is
        // no cached price at all (symbol never successfully fetched).
        if (dbFetch) return dbFetch;
        throw err;
      }
    } else {
      return dbFetch!;
    }
  };

  liveFetchRequiredQuote = (dbFetch: IPriceStoreModel | undefined): boolean => {
    if (!dbFetch) return true;

    // Derive current time in ET so market-hours checks are timezone-correct.
    const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etNow.getDay();
    const minutesSinceMidnight = etNow.getHours() * 60 + etNow.getMinutes();
    const marketOpen = 9 * 60 + 30;
    const marketClose = 16 * 60;
    const isWeekend = day === 0 || day === 6;
    const isMarketHours = !isWeekend && minutesSinceMidnight >= marketOpen && minutesSinceMidnight < marketClose;

    if (isMarketHours) {
      // Within market hours: refresh if cached quote is older than 120 seconds.
      return moment().diff(moment(dbFetch.updatedAt), 'seconds') >= 120;
    }

    // Outside market hours: refresh if cache was last updated before the most recent
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
