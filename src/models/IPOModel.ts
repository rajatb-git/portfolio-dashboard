export interface IIPO {
  id: string;
  date: string;
  exchange: string;
  name: string;
  numberOfShares: number;
  price: string;
  status: 'expected' | 'priced' | 'withdrawn' | 'filed';
  symbol: string;
  totalSharesValue: number;
}
