import moment from 'moment';
import { getRecommendation } from '../externalApis/finnHub';
import { IRecommendationModel, RecommendationDBModel } from '../models/RecommendationModel';

const recommendationModel = RecommendationDBModel();
recommendationModel.initialize();

export class LiveRecommendationController {
  getLiveRecommendation = async (symbol: string): Promise<IRecommendationModel> => {
    const dbFetch = recommendationModel.findById(symbol);

    if (this.liveFetchRequired(dbFetch)) {
      const apiFetch = await getRecommendation(symbol);

      // cases when recommendation is not available like index funds
      // insert dummy record
      if (!apiFetch && !dbFetch) {
        return recommendationModel.insertOne(
          {
            buy: -1,
            hold: -1,
            period: '',
            sell: -1,
            strongBuy: -1,
            strongSell: -1,
          },
          symbol
        );
      }

      return apiFetch ? recommendationModel.insertOrUpdate(apiFetch, symbol) : dbFetch!;
    } else {
      return dbFetch!;
    }
  };

  liveFetchRequired = (dbFetch: IRecommendationModel | undefined): boolean => {
    if (dbFetch) {
      const currentDate = moment();
      const lastPriceDate = moment(dbFetch.updatedAt);

      // poll recommendations older than 24 hours only
      if (currentDate.diff(lastPriceDate, 'hours') <= 24) {
        return false;
      }

      return true;
    }

    return true;
  };
}
