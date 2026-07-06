import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface IAnnouncedIPO {
  symbol: string;
  name: string;
  date: string;
  announcedAt: string;
}

export const AnnouncedIPOSchema: SchemaType = {
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  announcedAt: { type: String, required: true },
};

export interface IAnnouncedIPOModel extends IAnnouncedIPO, ISkewerModel {}

// Records which IPO symbols have already been announced over MQTT so each new
// calendar entry fires exactly once. Keyed by symbol (never the `ipos` row id,
// which IPOController wipes and re-fetches roughly daily).
export const AnnouncedIPODBModel = () => new SkewerModel<IAnnouncedIPOModel>('announced_ipos', AnnouncedIPOSchema);
