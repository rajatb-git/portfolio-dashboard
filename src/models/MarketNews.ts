export interface IMarketNews {
  category: string; // News category.
  datetime: number; // Published time in UNIX timestamp.
  headline: string; // News headline.
  id: number; // News ID. This value can be used for minId params to get the latest news only.
  image: string; // Thumbnail image URL.
  related: string; // Related stocks and companies mentioned in the article.
  source: string; // News source.
  summary: string; // News summary.
  url: string; // URL of the original article.
}
