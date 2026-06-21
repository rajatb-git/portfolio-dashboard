import axios from './axios';

import { DB_HOST } from '@/config';
import type { IAlert, IAlertStatus } from '@/models/AlertModel';
import { catchCustomError } from './apiUtil';

export default class AlertsAPI {
  getAll = async (): Promise<IAlert[]> =>
    axios
      .get(DB_HOST + '/alerts')
      .then((res) => res.data)
      .catch(catchCustomError);

  getStatus = async (): Promise<IAlertStatus[]> =>
    axios
      .get(DB_HOST + '/alerts/status')
      .then((res) => res.data)
      .catch(catchCustomError);

  create = async (alert: IAlert): Promise<IAlert> =>
    axios
      .put(DB_HOST + '/alerts', alert)
      .then((res) => res.data)
      .catch(catchCustomError);

  update = async (id: string, alert: IAlert): Promise<IAlert> =>
    axios
      .post(DB_HOST + `/alerts/${id}`, alert)
      .then((res) => res.data)
      .catch(catchCustomError);

  remove = async (id: string): Promise<{ deleted: string }> =>
    axios
      .delete(DB_HOST + `/alerts/${id}`)
      .then((res) => res.data)
      .catch(catchCustomError);
}
