import axios from './axios';

import { DB_HOST } from '@/config';

import { catchCustomError } from './apiUtil';

export default class LogsAPI {
  getLogs = async (file: string): Promise<string> =>
    axios(DB_HOST + `/logs/${encodeURIComponent(file)}`)
      .then((response) => response.data)
      .catch(catchCustomError);

  deleteLogs = async (file: string): Promise<string> =>
    axios
      .delete(DB_HOST + `/logs/${encodeURIComponent(file)}`)
      .then((response) => response.data)
      .catch(catchCustomError);
}
