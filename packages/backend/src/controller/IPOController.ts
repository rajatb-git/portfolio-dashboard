import moment from 'moment';
import { getUpcomingIPOs } from '../externalApis/finnHub';
import { IIPOModel, IPODBModel } from '../models/IPOModel';
import { CacheDBModel } from '../models/CacheModel';

const cacheKey = 'lastIPOFetchDate';

const ipoModel = IPODBModel();
ipoModel.initialize();

export class IPOController {
  getIPOs = async (): Promise<Array<IIPOModel> | Error> => {
    if (this.isIPOFetchRequired()) {
      ipoModel.deleteAll();

      const apiFetch = (await getUpcomingIPOs())?.ipoCalendar;

      apiFetch && (await ipoModel.insertMany(apiFetch));

      await CacheDBModel().insertOrUpdate({ key: cacheKey, value: moment().format() }, cacheKey);
    }

    return ipoModel.getAllRecords();
  };

  isIPOFetchRequired = (): boolean => {
    let flag = true;
    const lastIPOFetchDate = moment(CacheDBModel().findById(cacheKey)?.value || null);

    if (lastIPOFetchDate.isValid()) {
      const currentDate = moment();

      // poll only one per week
      if (currentDate.diff(moment(lastIPOFetchDate), 'hours') >= 24) {
        flag = true;
      } else {
        flag = false;
      }
    }

    return flag;
  };
}
