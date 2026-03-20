import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IDividend {
  holdingSymbol: string;
  accountId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'regular' | 'special' | 'qualified';
  shares: number;
}

export const DividendSchema: SchemaType = {
  holdingSymbol: { type: String, required: true },
  accountId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  type: { type: String, enum: ['regular', 'special', 'qualified'], required: true },
  shares: { type: Number, required: true },
};

export interface IDividendModel extends IDividend, ISkewerModel {}

export const DividendDBModel = () => new SkewerModel<IDividendModel>('dividends', DividendSchema);
