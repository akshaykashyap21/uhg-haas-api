import express from 'express';
import {
  correlationIdMiddleware,
  corsMiddleware,
  createLogger,
  createRateLimiter,
  errorHandler,
  notFoundHandler,
  requestLogger,
  securityHeaders,
} from '@uhg-haas/shared';
import { env } from './config/env';
import { createServiceProxy } from './proxy/serviceProxy';
import docsRoutes from './routes/docs.routes';
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
  app.use(correlationIdMiddleware);
  app.use(requestLogger(logger));
  app.use(createRateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX));

  app.use(healthRoutes);
  app.use('/api/docs', docsRoutes);

  // Do not parse JSON here — body must stream through to upstream services
  app.use(
    '/api/v1/auth',
    createServiceProxy(env.AUTH_SERVICE_URL, '/api/v1/auth', logger),
  );

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return { app, logger };
}
