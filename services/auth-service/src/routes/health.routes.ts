import { Router } from 'express';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res) => {
  let db = false;
  if (AppDataSource.isInitialized) {
    try {
      await AppDataSource.query('SELECT 1 AS ok');
      db = true;
    } catch {
      db = false;
    }
  }

  res.status(db ? 200 : 503).json({
    status: db ? 'ready' : 'not_ready',
    checks: { database: db ? 'up' : 'down' },
    service: env.SERVICE_NAME,
  });
});

export default router;
