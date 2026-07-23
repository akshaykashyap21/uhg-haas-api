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
  const base = env.AUTH_SERVICE_URL.replace(/\/$/, '');
  const authUrl = `${base}/api/v1/auth/ready`;

  let auth: 'up' | 'down' = 'down';
  let authDetail: Record<string, unknown> | undefined;

  try {
    const authRes = await fetch(authUrl, {
      signal: AbortSignal.timeout(3000),
      headers: { accept: 'application/json' },
    });
    const body = (await authRes.json().catch(() => null)) as Record<string, unknown> | null;
    auth = authRes.ok ? 'up' : 'down';
    authDetail = body ?? { httpStatus: authRes.status };
  } catch (err) {
    authDetail = { error: err instanceof Error ? err.message : 'fetch failed' };
  }

  res.status(auth === 'up' ? 200 : 503).json({
    status: auth === 'up' ? 'ready' : 'not_ready',
    checks: {
      auth,
      authUpstream: env.AUTH_SERVICE_URL,
    },
    authDetail,
    service: env.SERVICE_NAME,
  });
});

export default router;
