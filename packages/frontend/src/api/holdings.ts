import axios from './axios';

import { DB_HOST } from '@/config';
import { IHoldings, ITaxLot } from '@/models/HoldingsModel';
import { HoldingAggregate } from './dashboard';
import { catchCustomError } from './apiUtil';
import type { TaxConfig } from './analytics';

export type LotMethod = 'fifo' | 'lifo' | 'hifo' | 'taxOptimal' | 'specific';

export const LOT_METHOD_LABELS: Record<LotMethod, string> = {
  fifo: 'First in, first out (FIFO)',
  lifo: 'Last in, first out (LIFO)',
  hifo: 'Highest cost first',
  taxOptimal: 'Tax-optimized',
  specific: 'Specific lots',
};

// `date` is the day the trade actually happened, which can predate the entry.
export type TradePayload = Pick<IHoldings, 'accountId' | 'name' | 'symbol' | 'qty' | 'averagePrice' | 'type'> & {
  date?: string;
  lotMethod?: LotMethod;
};

export type TaxTerm = 'short' | 'long';

export type TaxLotView = ITaxLot & {
  costBasis: number;
  marketValue: number;
  gain: number;
  gainPercent: number;
  term: TaxTerm;
  longTermDate: string;
  daysToLongTerm: number;
};

export type PositionTaxSummary = {
  shortTermGain: number;
  longTermGain: number;
  shortTermQty: number;
  longTermQty: number;
  estimatedTax: number;
  hasEstimatedLots: boolean;
  nextLongTerm: { date: string; daysAway: number; qty: number; gain: number; taxSaving: number } | null;
};

export type SymbolPosition = HoldingAggregate & {
  id: string;
  lots: TaxLotView[];
  tax: PositionTaxSummary;
};

export type SimulationRequest = {
  action: 'buy' | 'sell';
  accountId: string;
  symbol: string;
  qty: number;
  price?: number;
  date?: string;
  type?: IHoldings['type'];
  lotMethod?: LotMethod;
  lotIds?: string[];
};

export type SimulatedLot = {
  lotId: string;
  acquired: string;
  qty: number;
  costPerShare: number;
  costBasis: number;
  proceeds: number;
  gain: number;
  term: TaxTerm;
  longTermDate: string;
  estimated: boolean;
};

export type SimulatedPosition = {
  qty: number;
  averagePrice: number;
  costBasis: number;
  marketValue: number;
  unrealizedGain: number;
  shortTermGain: number;
  longTermGain: number;
};

export type TradeSimulation = {
  action: 'buy' | 'sell';
  symbol: string;
  name: string;
  accountId: string;
  type: IHoldings['type'];
  qty: number;
  price: number;
  date: string;
  lotMethod: LotMethod | null;
  amount: number;
  costBasis: number | null;
  realized: { shortTerm: number; longTerm: number; total: number } | null;
  tax: {
    federal: number;
    state: number;
    total: number;
    lossDeduction: number;
    carryforward: number;
    ytdShortTerm: number;
    ytdLongTerm: number;
  } | null;
  netProceeds: number | null;
  lots: SimulatedLot[];
  comparison: Array<{ method: LotMethod; shortTermGain: number; longTermGain: number; gain: number; tax: number }>;
  washSale: { triggered: boolean; disallowedLoss: number; replacementQty: number; message: string } | null;
  waitForLongTerm: { date: string; daysAway: number; qty: number; taxSaving: number } | null;
  position: { before: SimulatedPosition | null; after: SimulatedPosition | null };
  portfolioWeight: { before: number; after: number };
  cash: { before: number; after: number };
  notes: Array<{ severity: 'info' | 'warning' | 'success'; message: string }>;
  config: TaxConfig;
};

export default class HoldingsAPI {
  // create
  create = async (holding: IHoldings): Promise<IHoldings> =>
    axios
      .put(DB_HOST + '/holdings', holding)
      .then((response) => response.data)
      .catch(catchCustomError);

  // read
  getAll = async (): Promise<Array<IHoldings>> =>
    axios(DB_HOST + '/holdings')
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getById = async (id: string): Promise<IHoldings> =>
    axios(DB_HOST + `/holdings/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // update
  insertOrUpdateById = async (holding: IHoldings): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings', { ...holding })
      .then((response) => response.data)
      .catch(catchCustomError);

  // delete
  deleteById = async (id: string): Promise<IHoldings> =>
    axios
      .delete(DB_HOST + `/holdings/${id}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // complete buy transaction
  buyHolding = async (holding: TradePayload): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings/buy', holding)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  // complete sell transaction
  sellHolding = async (holding: TradePayload): Promise<IHoldings> =>
    axios
      .post(DB_HOST + '/holdings/sell', holding)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);

  getBySymbol = async (symbol: string): Promise<Array<SymbolPosition>> =>
    axios
      .get(DB_HOST + `/holdings/symbol/${encodeURIComponent(symbol)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  // Replaces a position's tax lots; quantity and average cost follow them.
  updateLots = async (id: string, lots: ITaxLot[]): Promise<IHoldings> =>
    axios
      .put(DB_HOST + `/holdings/${encodeURIComponent(id)}/lots`, { lots })
      .then((response) => response.data)
      .catch(catchCustomError);

  // Mock buy/sell — nothing is saved.
  simulate = async (request: SimulationRequest): Promise<TradeSimulation> =>
    axios
      .post(DB_HOST + '/holdings/simulate', request)
      .then((response) => response.data)
      .catch(catchCustomError);

  // file import
  insertHoldings = async (holdingsArray: Array<IHoldings>): Promise<string> => {
    return axios
      .post(DB_HOST + '/holdings/import', holdingsArray)
      .then((response) => {
        return response.data;
      })
      .catch(catchCustomError);
  };
}
