import { Router } from 'express';
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
  let auth = 'down';
  try {
    const authRes = await fetch(`${env.AUTH_SERVICE_URL}/ready`, {
      signal: AbortSignal.timeout(3000),
    });
    auth = authRes.ok ? 'up' : 'down';
  } catch {
    auth = 'down';
  }

  res.status(auth === 'up' ? 200 : 503).json({
    status: auth === 'up' ? 'ready' : 'not_ready',
    checks: { auth },
    service: env.SERVICE_NAME,
  });
});

export default router;
