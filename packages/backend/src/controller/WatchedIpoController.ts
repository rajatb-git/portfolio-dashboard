import { IWatchedIPOModel, WatchedIPODBModel } from '../models/WatchedIPOModel';

export class WatchedIpoController {
  watch = async (symbol: string, name: string, date: string): Promise<IWatchedIPOModel> => {
    const model = await WatchedIPODBModel().initialize();
    const existing = model.findById(symbol);
    return model.insertOrUpdate({ symbol, name, date, reminderSent: existing?.reminderSent ?? false }, symbol);
  };

  unwatch = async (symbol: string): Promise<void> => {
    const model = await WatchedIPODBModel().initialize();
    if (model.findById(symbol)) await model.deleteById(symbol);
  };

  getWatchedSymbols = async (): Promise<Set<string>> => {
    const model = await WatchedIPODBModel().initialize();
    return new Set(model.getAllRecords().map((r) => r.symbol));
  };

  getAllWatched = async (): Promise<IWatchedIPOModel[]> => {
    const model = await WatchedIPODBModel().initialize();
    return model.getAllRecords();
  };
}
