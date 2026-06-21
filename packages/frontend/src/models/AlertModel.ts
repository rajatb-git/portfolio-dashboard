export interface IAlert {
  id?: string;
  symbol: string;
  type: 'stock' | 'crypto';
  targetPrice: number;
  direction: 'above' | 'below';
  note?: string;
}

export interface IAlertStatus extends IAlert {
  id: string;
  currentPrice: number | null;
  percentChange: number | null;
  triggered: boolean;
}
