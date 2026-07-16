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

/**
 * Gateway readiness: probes auth under /api/v1/auth/ready (same prefix as proxy).
 * Falls back to /ready then /health for older auth builds.
 */
router.get('/ready', async (_req, res) => {
  const base = env.AUTH_SERVICE_URL.replace(/\/$/, '');
  const candidates = [`${base}/api/v1/auth/ready`, `${base}/ready`, `${base}/health`];

  let authStatus: 'up' | 'not_ready' | 'unreachable' = 'unreachable';
  let authDetail: Record<string, unknown> | string | undefined;
  let usedUrl: string | undefined;
  let sawHttpResponse = false;

  for (const authUrl of candidates) {
    try {
      const authRes = await fetch(authUrl, {
        signal: AbortSignal.timeout(3000),
        headers: { accept: 'application/json' },
      });
      const text = await authRes.text();
      let body: Record<string, unknown> | null = null;
      try {
        body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        body = null;
      }

      usedUrl = authUrl;
      sawHttpResponse = true;

      if (authRes.ok) {
        const isHealthFallback = authUrl.endsWith('/health');
        authStatus = 'up';
        authDetail = isHealthFallback
          ? { note: 'auth /ready missing; /health OK (DB not verified)', body }
          : (body ?? undefined);
        break;
      }

      if (authRes.status === 404) {
        authDetail = {
          httpStatus: 404,
          url: authUrl,
          body: body ?? text.slice(0, 200),
        };
        continue;
      }

      authStatus = 'not_ready';
      authDetail = body ?? { httpStatus: authRes.status, url: authUrl, body: text.slice(0, 200) };
      break;
    } catch (err) {
      authDetail = err instanceof Error ? err.message : 'fetch failed';
      usedUrl = authUrl;
      continue;
    }
  }

  if (sawHttpResponse && authStatus === 'unreachable') {
    authStatus = 'not_ready';
  }

  const ready = authStatus === 'up';
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: {
      auth: authStatus,
      authUpstream: env.AUTH_SERVICE_URL,
      probedUrl: usedUrl,
    },
    authDetail,
    service: env.SERVICE_NAME,
  });
});

export default router;
