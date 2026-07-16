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
  const authUrl = `${env.AUTH_SERVICE_URL}/ready`;
  let authStatus: 'up' | 'not_ready' | 'unreachable' = 'unreachable';
  let authDetail: Record<string, unknown> | string | undefined;

  try {
    const authRes = await fetch(authUrl, {
      signal: AbortSignal.timeout(3000),
    });
    const body = (await authRes.json().catch(() => null)) as Record<string, unknown> | null;

    if (authRes.ok) {
      authStatus = 'up';
      authDetail = body ?? undefined;
    } else {
      // Process is up, but its own readiness failed (almost always database).
      authStatus = 'not_ready';
      authDetail = body ?? { httpStatus: authRes.status };
    }
  } catch (err) {
    authStatus = 'unreachable';
    authDetail = err instanceof Error ? err.message : 'fetch failed';
  }

  const ready = authStatus === 'up';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: {
      auth: authStatus,
      authUpstream: env.AUTH_SERVICE_URL,
    },
    authDetail,
    service: env.SERVICE_NAME,
  });
});

export default router;
