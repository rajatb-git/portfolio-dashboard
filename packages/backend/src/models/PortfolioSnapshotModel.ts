import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IPortfolioSnapshot {
  timestamp: string; // ISO 8601, unique per calculation — used as record ID
  date: string; // YYYY-MM-DD, calendar day this snapshot belongs to
  totalValue: number;
}

export const PortfolioSnapshotSchema: SchemaType = {
  timestamp: { type: String, required: true },
  date: { type: String, required: true },
  totalValue: { type: Number, required: true },
};

export interface IPortfolioSnapshotModel extends IPortfolioSnapshot, ISkewerModel {}

export const PortfolioSnapshotDBModel = () =>
  new SkewerModel<IPortfolioSnapshotModel>('portfolio_snapshots', PortfolioSnapshotSchema);
