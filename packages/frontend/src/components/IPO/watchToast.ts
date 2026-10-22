import { toast } from 'react-toastify';

import type { WatchIpoResult } from '@/api/live';

export const toastWatchResult = (symbol: string, { reminder }: WatchIpoResult) => {
  if (!reminder.enabled) {
    toast.warning(`Watching ${symbol}, but IPO reminders are turned off in Settings, so you won't be reminded`);
    return;
  }
  const when = reminder.daysBefore === 0 ? 'on the day it lists' : `${reminder.daysBefore} day(s) before it lists`;
  if (!reminder.channelEnabled) {
    toast.warning(
      `Watching ${symbol}. The reminder ${when} will only appear on the Notifications page — set up MQTT in Settings to get it on your phone`
    );
    return;
  }
  toast.success(`Watching ${symbol} — you'll get a reminder ${when}`);
};
