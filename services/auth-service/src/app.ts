import express from 'express';
import {
  correlationIdMiddleware,
  corsMiddleware,
  createRateLimiter,
  createLogger,
  errorHandler,
  notFoundHandler,
  requestLogger,
  securityHeaders,
} from '@uhg-haas/shared';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';

export function createApp() {
  const app = express();
  const logger = createLogger({
    serviceName: env.SERVICE_NAME,
    level: env.LOG_LEVEL,
    nodeEnv: env.NODE_ENV,
  });

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders());
  app.use(corsMiddleware(env.CORS_ORIGIN));
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationIdMiddleware);
  app.use(requestLogger(logger));
  app.use(createRateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX));

  app.use(healthRoutes);
  app.use('/api/v1/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return { app, logger };
}
