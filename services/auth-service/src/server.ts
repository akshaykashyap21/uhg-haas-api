import 'reflect-metadata';
import { initializeDataSource } from '@app/shared';
import { createApp } from './app';
import { AppDataSource } from './config/data-source';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const { app, logger } = createApp();

  try {
    await initializeDataSource(AppDataSource);
    logger.info('Connected to Azure SQL Database', {
      host: env.AZURE_SQL_HOST,
      database: env.AZURE_SQL_DATABASE,
    });

    const server = app.listen(env.PORT, () => {
      logger.info(`${env.SERVICE_NAME} listening on port ${env.PORT}`, {
        env: env.NODE_ENV,
      });
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
        }
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start auth-service', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

void bootstrap();
