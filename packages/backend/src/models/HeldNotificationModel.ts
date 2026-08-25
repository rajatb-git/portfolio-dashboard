import { ISkewerModel, MongoModel, SchemaType } from '../utils/mongoModel';
import type { NotificationKind } from './NotificationHistoryModel';

export interface IHeldNotification {
  kind: NotificationKind;
  symbol: string;
  title: string;
  message: string;
  topic: string;
  heldAt: string;
}

export const HeldNotificationSchema: SchemaType = {
  kind: { type: String, required: true },
  symbol: { type: String, required: false },
  title: { type: String, required: true },
  message: { type: String, required: false },
  topic: { type: String, required: false },
  heldAt: { type: String, required: true },
};

export interface IHeldNotificationModel extends IHeldNotification, ISkewerModel {}

// Notifications parked by quiet hours in digest mode, drained into a single
// summary once the window ends.
export const HeldNotificationDBModel = () =>
  new MongoModel<IHeldNotificationModel>('held_notifications', HeldNotificationSchema);
