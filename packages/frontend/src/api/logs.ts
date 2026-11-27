import axios from './axios';

import { DB_HOST } from '@/config';

import type { IAiRequestLog } from '@/models/AiRequestLogModel';

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

  getAiRequests = async (): Promise<IAiRequestLog[]> =>
    axios(DB_HOST + '/ai-requests')
      .then((response) => response.data)
      .catch(catchCustomError);

  clearAiRequests = async (): Promise<IAiRequestLog[]> =>
    axios
      .delete(DB_HOST + '/ai-requests')
      .then((response) => response.data)
      .catch(catchCustomError);
}
