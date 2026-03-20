import { ISkewerModel, SchemaType, SkewerModel } from 'skewer-db';

export interface newsRecord {
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface INews {
  lastUpdated: Date;
  records: Array<newsRecord>;
}

export const NewsSchema: SchemaType = {
  lastUpdated: { type: String, required: true },
  records: { type: Array },
};

export interface INewsModel extends INews, ISkewerModel {}

export const NewsDBModel = () => new SkewerModel<INewsModel>('news', NewsSchema);
