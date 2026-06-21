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

export type ValueCalcConfig = {
  enabled: boolean;
  intervalMinutes: number;
};

export type AlertMonitorConfig = {
  enabled: boolean;
  intervalMinutes: number;
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

  getValueCalcConfig = async (): Promise<ValueCalcConfig> =>
    axios
      .get(DB_HOST + '/settings/value-calc')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveValueCalcConfig = async (payload: ValueCalcConfig): Promise<ValueCalcConfig> =>
    axios
      .post(DB_HOST + '/settings/value-calc', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  getAlertMonitorConfig = async (): Promise<AlertMonitorConfig> =>
    axios
      .get(DB_HOST + '/settings/alerts-monitor')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveAlertMonitorConfig = async (payload: AlertMonitorConfig): Promise<AlertMonitorConfig> =>
    axios
      .post(DB_HOST + '/settings/alerts-monitor', payload)
      .then((response) => response.data)
      .catch(catchCustomError);
}
