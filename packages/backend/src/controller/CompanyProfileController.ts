import { getCompanyProfile } from '../externalApis/finnHub';

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
  getCompanyProfile2 = async (symbol: string): Promise<CompanyProfile2> => {
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
  };
}
