import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';

// Every notification kind the dispatcher can deliver. Kept as a union so the
// history page can filter and colour-code by source.
export type NotificationKind =
  | 'alert'
  | 'move'
  | 'spike'
  | 'news'
  | 'ipo_reminder'
  | 'ipo_announcement'
  | 'earnings'
  | 'earnings_result'
  | 'dividend'
  | 'summary'
  | 'digest'
  | 'test';

export interface INotificationHistory {
  kind: NotificationKind;
  symbol: string;
  title: string;
  message: string;
  topic: string;
  // Whether the publish actually landed on the broker.
  delivered: boolean;
  // True when quiet hours held or dropped it rather than publishing.
  suppressed: boolean;
  createdAt: string;
}

export const NotificationHistorySchema: SchemaType = {
  kind: { type: String, required: true },
  symbol: { type: String, required: false },
  title: { type: String, required: true },
  message: { type: String, required: false },
  topic: { type: String, required: false },
  delivered: { type: Boolean, required: false },
  suppressed: { type: Boolean, required: false },
  createdAt: { type: String, required: true },
};

export interface INotificationHistoryModel extends INotificationHistory, ISkewerModel {}

// A browsable record of everything the app has told the user, so thresholds can
// be tuned against what actually fired instead of guesswork.
export const NotificationHistoryDBModel = () =>
  new MongoModel<INotificationHistoryModel>('notification_history', NotificationHistorySchema);

const RETENTION_DAYS = 30;

export async function recordNotification(entry: Omit<INotificationHistory, 'createdAt'>): Promise<void> {
  const model = await NotificationHistoryDBModel().initialize();
  await model.insertOne({ ...entry, createdAt: new Date().toISOString() });
}

export async function pruneNotificationHistory(): Promise<number> {
  const model = await NotificationHistoryDBModel().initialize();
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const stale = model.getAllRecords().filter((rec) => new Date(rec.createdAt).getTime() < cutoff);
  for (const rec of stale) await model.deleteById(rec.id);
  return stale.length;
}
