import moment from 'moment';
import { getQuoteForSymbol } from '../externalApis/finnHub';
import { IPriceStoreModel, PriceStoreDBModel } from '../models/PriceStoreModel';

const priceStoreModel = PriceStoreDBModel();
priceStoreModel.initialize();

export class LiveQuoteController {
  getLiveQuote = async (symbol: string, isCrypto = false): Promise<IPriceStoreModel> => {
    const dbFetch = priceStoreModel.findById(symbol);

    if (this.liveFetchRequiredQuote(dbFetch)) {
      const apiFetch = await getQuoteForSymbol(symbol, isCrypto);
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
    } else {
      return dbFetch!;
    }
  };

  liveFetchRequiredQuote = (dbFetch: IPriceStoreModel | undefined): boolean => {
    if (dbFetch) {
      // Derive current time in ET so market-hours checks are timezone-correct.
      const etNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = etNow.getDay();

      // Weekend: prices don't move, serve cache.
      if (day === 0 || day === 6) return false;

      // NYSE regular session: 9:30am–4:00pm ET.
      const minutesSinceMidnight = etNow.getHours() * 60 + etNow.getMinutes();
      const marketOpen = 9 * 60 + 30;
      const marketClose = 16 * 60;
      if (minutesSinceMidnight < marketOpen || minutesSinceMidnight >= marketClose) return false;

      // Within market hours: refresh if cached quote is older than 120 seconds.
      return moment().diff(moment(dbFetch.updatedAt), 'seconds') >= 120;
    }

    return true;
  };
}
