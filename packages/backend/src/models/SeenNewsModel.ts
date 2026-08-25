import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface ISeenNews {
  symbol: string;
  headline: string;
  url: string;
  seenAt: string;
}

export const SeenNewsSchema: SchemaType = {
  symbol: { type: String, required: false },
  headline: { type: String, required: true },
  url: { type: String, required: false },
  seenAt: { type: String, required: true },
};

export interface ISeenNewsModel extends ISeenNews, ISkewerModel {}

// Records which articles the news watcher has already pushed, so each headline
// fires exactly once. Keyed by a stable hash of the article URL/headline.
export const SeenNewsDBModel = () => new MongoModel<ISeenNewsModel>('seen_news', SeenNewsSchema);
