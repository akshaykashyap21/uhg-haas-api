import express from 'express';
import {
  correlationIdMiddleware,
  corsMiddleware,
  createRateLimiter,
  errorHandler,
  notFoundHandler,
  requestLogger,
  securityHeaders,
} from '@uhg-haas/shared';
import { env } from './config/env';
import { logger as authLogger } from './config/logger';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';

export function createApp() {
  const app = express();
  const logger = authLogger;

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(securityHeaders());
  app.use(corsMiddleware(env.CORS_ORIGIN));
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationIdMiddleware);

  // Visible even if winston is misconfigured — proves the request hit Express
  app.use((req, _res, next) => {
    // eslint-disable-next-line no-console
    console.log(`[auth-trace] ${req.method} ${req.originalUrl} (url=${req.url}) cid=${req.correlationId}`);
    logger.info('Auth inbound', {
      stage: 'inbound',
      correlationId: req.correlationId,
      method: req.method,
      originalUrl: req.originalUrl,
      url: req.url,
    });
    next();
  });

  app.use(requestLogger(logger));
  app.use(createRateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX));

  app.use(healthRoutes);

  /** Root ping — http://127.0.0.1:3001/ping */
  app.get('/ping', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: env.SERVICE_NAME,
      authBase: '/api/v1/auth',
      tips: ['GET /health', 'GET /ping', 'GET /api/v1/auth/__ping', 'POST /api/v1/auth/register'],
    });
  });

  app.use('/api/v1/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return { app, logger };
}
