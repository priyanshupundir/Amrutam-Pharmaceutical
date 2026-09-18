import pino from 'pino';
import { config } from '../config';
import { getCorrelationId } from './async-context';

const isDev = config.NODE_ENV === 'development';

export const logger = pino({
  level: config.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  mixin() {
    const correlationId = getCorrelationId();
    return { correlationId };
  },
  base: isDev ? undefined : { service: 'amrutam-telemedicine', env: config.NODE_ENV },
});
