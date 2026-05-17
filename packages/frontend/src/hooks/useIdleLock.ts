import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'keydown',
  'touchstart',
  'click',
];

export function useIdleLock({
  enabled,
  idleTimeoutMinutes,
}: {
  enabled: boolean;
  idleTimeoutMinutes: number;
}) {
  const { lock } = useAuth();

  React.useEffect(() => {
    if (!enabled || idleTimeoutMinutes <= 0) return;

    const timeoutMs = idleTimeoutMinutes * 60_000;
    let timerId: number | undefined;

    const reset = () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        lock().catch(() => undefined);
      }, timeoutMs);
    };

    reset();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, reset, { passive: true });
    }

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, reset);
      }
    };
  }, [enabled, idleTimeoutMinutes, lock]);
}
