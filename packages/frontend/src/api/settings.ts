import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type LockStatus = { enabled: boolean; idleTimeoutMinutes: number };

export type LockSavePayload = {
  enabled: boolean;
  code?: string;
  currentCode?: string;
  idleTimeoutMinutes?: number;
};

export default class SettingsAPI {
  getLock = async (): Promise<LockStatus> =>
    axios
      .get(DB_HOST + '/settings/lock')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveLock = async (payload: LockSavePayload): Promise<LockStatus> =>
    axios
      .post(DB_HOST + '/settings/lock', payload)
      .then((response) => response.data)
      .catch(catchCustomError);
}
