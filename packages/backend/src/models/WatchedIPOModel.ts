import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IWatchedIPO {
  symbol: string;
  name: string;
  date: string;
  reminderSent: boolean;
}

export const WatchedIPOSchema: SchemaType = {
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  reminderSent: { type: Boolean, required: true },
};

export interface IWatchedIPOModel extends IWatchedIPO, ISkewerModel {}

// Keyed by symbol (never the ipos row's own id) since IPOController wipes and
// re-fetches the `ipos` collection roughly daily — row ids don't survive that.
export const WatchedIPODBModel = () => new SkewerModel<IWatchedIPOModel>('watched_ipos', WatchedIPOSchema);
