import { createLogger } from '@uhg-haas/shared';
import { env } from './env';

export const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
  nodeEnv: env.NODE_ENV,
});
