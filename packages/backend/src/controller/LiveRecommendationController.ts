import moment from 'moment';
import { getRecommendation } from '../externalApis/finnHub';
import { IRecommendationModel, RecommendationDBModel } from '../models/RecommendationModel';

const recommendationModel = RecommendationDBModel();
const recommendationReady = recommendationModel.initialize();

const NO_RECOMMENDATION = { buy: -1, hold: -1, period: '', sell: -1, strongBuy: -1, strongSell: -1 };

// Dedupes concurrent refreshes for the same symbol across per-request controllers.
const inFlightRefreshes = new Map<string, Promise<IRecommendationModel>>();

export class LiveRecommendationController {
  getLiveRecommendation = async (symbol: string): Promise<IRecommendationModel> => {
    await recommendationReady;
    const dbFetch = recommendationModel.findById(symbol);

    // No cached recommendation yet — fetch once (blocking).
    if (!dbFetch) {
      return this.refreshRecommendation(symbol);
    }

    // Stale-while-revalidate: refresh in the background and return the cached value
    // now, so the dashboard never blocks on the recommendations API.
    if (this.liveFetchRequired(dbFetch)) {
      void this.refreshRecommendation(symbol).catch(() => {});
    }

    return dbFetch;
  };

  private refreshRecommendation = (symbol: string): Promise<IRecommendationModel> => {
    const existing = inFlightRefreshes.get(symbol);
    if (existing) return existing;

    const promise = this.fetchAndStore(symbol).finally(() => {
      inFlightRefreshes.delete(symbol);
    });
    inFlightRefreshes.set(symbol, promise);
    return promise;
  };

  private fetchAndStore = async (symbol: string): Promise<IRecommendationModel> => {
    const apiFetch = await getRecommendation(symbol);
    if (apiFetch) {
      return recommendationModel.insertOrUpdate(apiFetch, symbol);
    }

    // No recommendation available (e.g. index funds). Reuse the existing record if any,
    // otherwise store a sentinel so we don't keep refetching a symbol that has none.
    const existing = recommendationModel.findById(symbol);
    return existing ?? recommendationModel.insertOne({ ...NO_RECOMMENDATION }, symbol);
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
