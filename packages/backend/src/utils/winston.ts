import moment from 'moment';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf } = format;

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

export const logger = createLogger({
  level: 'info',
  format: combine(timestamp(), myFormat),
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});
