export type MarketNewsResponse = Array<{
  category: string; // News category.
  datetime: number; // Published time in UNIX timestamp.
  headline: string; // News headline.
  id: number; // News ID. This value can be used for minId params to get the latest news only.
  image: string; // Thumbnail image URL.
  related: string; // Related stocks and companies mentioned in the article.
  source: string; // News source.
  summary: string; // News summary.
  url: string; // URL of the original article.
}>;

export type QuoteResponse = {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // timestamp
};

export type UpcomingIPOsResponse = {
  // Array of IPO events
  ipoCalendar: Array<{
    date: string; // IPO date.
    exchange: string; // Exchange.
    name: string; // Company's name.
    numberOfShares: number; // Number of shares offered during the IPO.
    price: string; // Projected price or price range.
    status: string; // IPO status. Can take 1 of the following values: expected,priced,withdrawn,filed
    symbol: string; // Symbol.
    totalSharesValue: number; // Total shares value.
  }>;
};

export type RecommendationResponse = Array<{
  buy: number; // Number of recommendations that fall into the Buy category
  hold: number; // Number of recommendations that fall into the Hold category
  period: string; // Updated period
  sell: number; // Number of recommendations that fall into the Sell category
  strongBuy: number; // Number of recommendations that fall into the Strong Buy category
  strongSell: number; // Number of recommendations that fall into the Strong Sell category
  symbol: string; // Company symbol.
}>;

export type CompanyProfile2Response = {
  country: string; // Country.
  currency: string; // Currency.
  exchange: string; // Exchange.
  finnhubIndustry: string; // Industry.
  ipo: string; // IPO date.
  logo: string; // Company logo.
  marketCapitalization: number; // Market capitalization.
  name: string; // Company name.
  phone: string; // Phone number.
  shareOutstanding: number; // Number of shares outstanding.
  ticker: string; // Ticker symbol.
  weburl: string; // Website URL.
};
