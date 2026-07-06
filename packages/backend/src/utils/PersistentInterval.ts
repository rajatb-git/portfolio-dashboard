import { getJobState, setJobState } from '../models/JobRunStateModel';
import { logger } from './winston';

const LABEL = 'PersistentInterval';

// setInterval wrapper that persists each run's timestamp to SkewerDB so the
// schedule survives process restarts. On start(), it only fires an immediate
// catch-up run if the interval has actually elapsed since the last recorded
// run, instead of unconditionally kicking every time the process boots.
export class PersistentInterval {
  private timer: NodeJS.Timeout | null = null;
  private readonly stateKey: string;

  constructor(private readonly jobName: string) {
    this.stateKey = `${jobName}:lastRunAt`;
  }

  async start(intervalMs: number, run: () => Promise<unknown> | void): Promise<void> {
    this.stop();

    const wrapped = async (): Promise<void> => {
      try {
        await run();
      } finally {
        try {
          await setJobState(this.stateKey, new Date().toISOString());
        } catch (err: any) {
          logger.log({ level: 'error', label: LABEL, message: `Failed to persist ${this.jobName}: ${err.message}` });
        }
      }
    };

    this.timer = setInterval(() => void wrapped(), intervalMs);

    let lastRunAt: Date | null = null;
    try {
      const raw = await getJobState(this.stateKey);
      lastRunAt = raw ? new Date(raw) : null;
    } catch (err: any) {
      logger.log({ level: 'error', label: LABEL, message: `Failed to read state for ${this.jobName}: ${err.message}` });
    }

    if (!lastRunAt || Date.now() - lastRunAt.getTime() >= intervalMs) {
      void wrapped();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
