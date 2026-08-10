import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

export interface IRecommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
}

export const RecommendationSchema: SchemaType = {
  buy: { type: Number },
  hold: { type: Number },
  period: { type: String },
  sell: { type: Number },
  strongBuy: { type: Number },
  strongSell: { type: Number },
};

export interface IRecommendationModel extends IRecommendation, ISkewerModel {}

export const RecommendationDBModel = () =>
  new MongoModel<IRecommendationModel>('recommendations', RecommendationSchema);
