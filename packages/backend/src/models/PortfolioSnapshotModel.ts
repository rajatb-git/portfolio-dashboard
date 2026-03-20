import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IPortfolioSnapshot {
  date: string; // YYYY-MM-DD, used as record ID
  totalValue: number;
}

export const PortfolioSnapshotSchema: SchemaType = {
  date: { type: String, required: true },
  totalValue: { type: Number, required: true },
};

export interface IPortfolioSnapshotModel extends IPortfolioSnapshot, ISkewerModel {}

export const PortfolioSnapshotDBModel = () =>
  new SkewerModel<IPortfolioSnapshotModel>('portfolio_snapshots', PortfolioSnapshotSchema);
