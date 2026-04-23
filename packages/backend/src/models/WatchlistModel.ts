import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IWatchlistItem {
  symbol: string;
  addedAt: string;
}

export const WatchlistSchema: SchemaType = {
  symbol: { type: String, required: true },
  addedAt: { type: String, required: true },
};

export interface IWatchlistItemModel extends IWatchlistItem, ISkewerModel {}

export const WatchlistDBModel = () => new SkewerModel<IWatchlistItemModel>('watchlist', WatchlistSchema);
