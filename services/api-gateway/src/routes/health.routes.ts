import { Router } from 'express';
import { env } from '../config/env';

const router = Router();

function looksLikeAuthJson(body: Record<string, unknown> | null): boolean {
  if (!body) return false;
  return body.service === 'auth-service' || body.ok === true || body.checks != null;
}

router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: env.SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Gateway readiness: probes auth-service.
 * If port 3001 returns HTML 404, something else owns that port — not auth-service.
 */
router.get('/ready', async (_req, res) => {
  const base = env.AUTH_SERVICE_URL.replace(/\/$/, '');
  const candidates = [`${base}/api/v1/auth/ready`, `${base}/ready`, `${base}/health`, `${base}/ping`];

  let authStatus: 'up' | 'not_ready' | 'unreachable' | 'wrong_process' = 'unreachable';
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
      const contentType = authRes.headers.get('content-type') ?? '';
      let body: Record<string, unknown> | null = null;
      try {
        body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      } catch {
        body = null;
      }

      usedUrl = authUrl;
      sawHttpResponse = true;

      const isHtml =
        contentType.includes('text/html') ||
        /^\s*<!DOCTYPE html/i.test(text) ||
        /^\s*<html/i.test(text);

      if (isHtml) {
        authStatus = 'wrong_process';
        authDetail = {
          problem:
            `Port on ${base} returned HTML, not auth-service JSON. ` +
            'Another process owns that port (or auth is not running there).',
          hint: 'Run: netstat -ano | findstr :3001   then Stop-Process -Id <PID> -Force',
          url: authUrl,
          httpStatus: authRes.status,
          bodyPreview: text.slice(0, 180),
        };
        // no point trying other paths on the same wrong server
        break;
      }

      if (authRes.ok && looksLikeAuthJson(body)) {
        authStatus = 'up';
        authDetail = body ?? undefined;
        break;
      }

      if (authRes.ok) {
        // 200 but not our JSON shape — still suspicious
        authStatus = 'wrong_process';
        authDetail = {
          problem: 'Got HTTP 200 but response is not from auth-service',
          url: authUrl,
          body: body ?? text.slice(0, 200),
        };
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

      // 503 etc. from real auth (DB down)
      if (looksLikeAuthJson(body) || contentType.includes('application/json')) {
        authStatus = 'not_ready';
        authDetail = body ?? { httpStatus: authRes.status, url: authUrl };
        break;
      }

      authStatus = 'wrong_process';
      authDetail = {
        problem: 'Unexpected non-JSON response from AUTH_SERVICE_URL',
        httpStatus: authRes.status,
        url: authUrl,
        bodyPreview: text.slice(0, 180),
      };
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
