import axios from './axios';

import { DB_HOST } from '@/config';
import { catchCustomError } from './apiUtil';

export type AuthStatus = { enabled: boolean };
export type UnlockResponse = { token: string; expiresAt: number };

export default class AuthAPI {
  getStatus = async (): Promise<AuthStatus> =>
    axios
      .get(DB_HOST + '/auth/status')
      .then((response) => response.data)
      .catch(catchCustomError);

  unlock = async (code: string): Promise<UnlockResponse> =>
    axios
      .post(DB_HOST + '/auth/unlock', { code })
      .then((response) => response.data)
      .catch(catchCustomError);

  lock = async (): Promise<void> =>
    axios
      .post(DB_HOST + '/auth/lock')
      .then(() => undefined)
      .catch(catchCustomError);
}
