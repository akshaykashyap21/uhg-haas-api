import { createLogger } from '@uhg-haas/shared';
import { env } from './env';

/** Shared auth-service logger for route/controller/service tracing. */
export const logger = createLogger({
  serviceName: env.SERVICE_NAME,
  level: env.LOG_LEVEL,
  nodeEnv: env.NODE_ENV,
});
