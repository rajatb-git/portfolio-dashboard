import fs from 'node:fs';
import moment from 'moment';
import { createLogger, format } from 'winston';
import TransportStream from 'winston-transport';

const { combine, timestamp, printf } = format;

// winston writes the fully-formatted line under this symbol (from triple-beam).
const MESSAGE = Symbol.for('message');

// const levels = {
//   error: 0,
//   warn: 1,
//   info: 2,
//   http: 3,
//   verbose: 4,
//   debug: 5,
//   silly: 6,
// };

const myFormat = printf(
  ({ level, message, label, timestamp, ...meta }: any) =>
    `${moment(timestamp).format()} ${level.toUpperCase()} [${label}] (${message}): ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`
);

// winston's built-in File transport is append-only, which leaves the newest
// entry at the bottom of the file. This transport prepends each formatted line
// so the log file is newest-first on disk (not just when served to the UI).
// Each entry is a single line; this is a low-volume single-user app, so
// rewriting the file per write is acceptable.
class NewestFirstFileTransport extends TransportStream {
  private readonly filename: string;

  constructor(opts: TransportStream.TransportStreamOptions & { filename: string }) {
    super(opts);
    this.filename = opts.filename;
  }

  log(info: any, next: () => void): void {
    setImmediate(() => this.emit('logged', info));
    try {
      let existing = '';
      try {
        existing = fs.readFileSync(this.filename, 'utf8');
      } catch {
        // File doesn't exist yet — the write below creates it.
      }
      fs.writeFileSync(this.filename, `${info[MESSAGE]}\n${existing}`);
    } catch {
      // A logging failure must never crash the app.
    }
    next();
  }
}

export const logger = createLogger({
  level: 'info',
  format: combine(timestamp(), myFormat),
  transports: [
    new NewestFirstFileTransport({ filename: 'error.log', level: 'error' }),
    new NewestFirstFileTransport({ filename: 'combined.log' }),
  ],
});
