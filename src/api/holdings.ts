import { IHoldingsDBModel, HoldingsDBModel } from 'db/models/HoldingsDBModel';

export const getHoldingsData = async (): Promise<[Error | null, Array<IHoldingsDBModel>]> => {
  try {
    const holdings = HoldingsDBModel();

    return [null, holdings.getAllRecords()];
  } catch (err: any) {
    return [err as Error, []];
  }
};
