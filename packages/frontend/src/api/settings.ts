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

export type MoveAlertConfig = {
  enabled: boolean;
  intervalMinutes: number;
  thresholdPercent: number;
};

export type IpoReminderConfig = {
  enabled: boolean;
  daysBefore: number;
};

export type IpoAnnouncementConfig = {
  enabled: boolean;
  topic: string;
};

export type IpoAnnouncementTestResult = { ok: boolean; mqttEnabled: boolean };

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

export type ScheduledBackupConfig = {
  enabled: boolean;
  intervalHours: number;
  retentionCount: number;
};

export type BackupFile = { file: string; size: number; createdAt: string };

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

  getMoveAlertConfig = async (): Promise<MoveAlertConfig> =>
    axios
      .get(DB_HOST + '/settings/move-alert')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveMoveAlertConfig = async (payload: MoveAlertConfig): Promise<MoveAlertConfig> =>
    axios
      .post(DB_HOST + '/settings/move-alert', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  getIpoReminderConfig = async (): Promise<IpoReminderConfig> =>
    axios
      .get(DB_HOST + '/settings/ipo-reminder')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveIpoReminderConfig = async (payload: IpoReminderConfig): Promise<IpoReminderConfig> =>
    axios
      .post(DB_HOST + '/settings/ipo-reminder', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  getIpoAnnouncementConfig = async (): Promise<IpoAnnouncementConfig> =>
    axios
      .get(DB_HOST + '/settings/ipo-announcement')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveIpoAnnouncementConfig = async (payload: IpoAnnouncementConfig): Promise<IpoAnnouncementConfig> =>
    axios
      .post(DB_HOST + '/settings/ipo-announcement', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  testIpoAnnouncement = async (): Promise<IpoAnnouncementTestResult> =>
    axios
      .post(DB_HOST + '/settings/ipo-announcement/test')
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

  getScheduledBackupConfig = async (): Promise<ScheduledBackupConfig> =>
    axios
      .get(DB_HOST + '/settings/scheduled-backup')
      .then((response) => response.data)
      .catch(catchCustomError);

  saveScheduledBackupConfig = async (payload: ScheduledBackupConfig): Promise<ScheduledBackupConfig> =>
    axios
      .post(DB_HOST + '/settings/scheduled-backup', payload)
      .then((response) => response.data)
      .catch(catchCustomError);

  runScheduledBackup = async (): Promise<BackupFile> =>
    axios
      .post(DB_HOST + '/settings/scheduled-backup/run')
      .then((response) => response.data)
      .catch(catchCustomError);

  listBackups = async (): Promise<BackupFile[]> =>
    axios
      .get(DB_HOST + '/settings/backups')
      .then((response) => response.data)
      .catch(catchCustomError);

  downloadBackup = async (file: string): Promise<Blob> =>
    axios
      .get(DB_HOST + `/settings/backups/${encodeURIComponent(file)}`, { responseType: 'blob' })
      .then((response) => response.data)
      .catch(catchCustomError);
}
