import { getCompanyProfile } from '../externalApis/finnHub';
import { cachedFetch } from '../utils/cachedFetch';

// A company's country, industry, listing date and share count barely move, so
// this is cached for a day and revalidated in the background — it was previously
// a live Finnhub call on every Research page view.
const TTL_MINUTES = 24 * 60;

type CompanyProfile2 = {
  country: string;
  currency: string;
  exchange: string;
  industry: string;
  ipo: string;
  logo: string;
  marketCap: number;
  name: string;
  shareOutstanding: number;
  ticker: string;
};

export class CompanyProfileController {
  getCompanyProfile2 = (symbol: string, force = false): Promise<CompanyProfile2> =>
    cachedFetch(
      `company_profile_${symbol}`,
      TTL_MINUTES,
      async () => {
        const response = await getCompanyProfile(symbol);

        return {
          country: response.country,
          currency: response.currency,
          exchange: response.exchange,
          industry: response.finnhubIndustry,
          ipo: response.ipo,
          logo: response.logo,
          marketCap: response.marketCapitalization,
          name: response.name,
          shareOutstanding: response.shareOutstanding,
          ticker: response.ticker,
        };
      },
      force
    );
}
