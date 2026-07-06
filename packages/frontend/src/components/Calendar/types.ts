export type ICalendarEvent = {
  id?: string;
  title: string;
  numberOfShares?: number;
  exchange?: string;
  price?: string;
  status?: 'expected' | 'priced' | 'withdrawn' | 'filed';
  symbol?: string;
  totalSharesValue?: number;
  color: string;
  allDay: boolean;
  start: Date | string | null;
  end?: Date | string | null;
};
