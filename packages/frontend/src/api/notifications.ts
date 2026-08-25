import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type NotificationRecord = {
  id: string;
  kind: string;
  symbol: string;
  title: string;
  message: string;
  topic: string;
  delivered: boolean;
  suppressed: boolean;
  createdAt: string;
};

export type NotificationHistory = { total: number; items: NotificationRecord[] };

export default class NotificationsAPI {
  getHistory = async (limit = 100, kind = ''): Promise<NotificationHistory> =>
    axios
      .get(DB_HOST + '/notifications/history', { params: { limit, ...(kind ? { kind } : {}) } })
      .then((response) => response.data)
      .catch(catchCustomError);

  clearHistory = async (): Promise<{ deleted: number }> =>
    axios
      .delete(DB_HOST + '/notifications/history')
      .then((response) => response.data)
      .catch(catchCustomError);
}
