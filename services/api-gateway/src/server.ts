import { createApp } from './app';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const { app, logger } = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT}`, {
      env: env.NODE_ENV,
      authUpstream: env.AUTH_SERVICE_URL,
    });
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void bootstrap();
