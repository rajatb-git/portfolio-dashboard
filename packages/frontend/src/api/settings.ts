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

export type MqttConfig = {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  topic: string;
  qos: 0 | 1;
  retain: boolean;
};

export type NotificationConfig = { mqtt: MqttConfig };

export type NotificationTestResult = { mqtt: { enabled: boolean; ok: boolean; error?: string } };

export type TradingSummaryConfig = {
  enabled: boolean;
  topHoldingsCount: number;
  topic: string;
};

export type TradingSummaryTestResult = { published: number; mqttEnabled: boolean };

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

  getNotificationConfig = async (): Promise<NotificationConfig> =>
    axios
      .get(DB_HOST + '/settings/notifications')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveNotificationConfig = async (payload: NotificationConfig): Promise<NotificationConfig> =>
    axios
      .post(DB_HOST + '/settings/notifications', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  testNotification = async (): Promise<NotificationTestResult> =>
    axios
      .post(DB_HOST + '/settings/notifications/test')
      .then((response) => response.data)
      .catch(catchCustomError);

  getTradingSummaryConfig = async (): Promise<TradingSummaryConfig> =>
    axios
      .get(DB_HOST + '/settings/trading-summary')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveTradingSummaryConfig = async (payload: TradingSummaryConfig): Promise<TradingSummaryConfig> =>
    axios
      .post(DB_HOST + '/settings/trading-summary', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  testTradingSummary = async (): Promise<TradingSummaryTestResult> =>
    axios
      .post(DB_HOST + '/settings/trading-summary/test')
      .then((response) => response.data)
      .catch(catchCustomError);
}
