import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Logger } from 'winston';

/**
 * Proxies /api/v1/auth/* to auth-service with the same path.
 * Uses pathFilter (no Express mount strip) so upstream receives
 * /api/v1/auth/register — not /register.
 */
export function createServiceProxy(
  target: string,
  pathPrefix: string,
  logger: Logger,
): RequestHandler {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter: (pathname) =>
      pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`),
    proxyTimeout: 30000,
    timeout: 30000,
    on: {
      proxyReq: (proxyReq, req) => {
        const correlationId = (req as { correlationId?: string }).correlationId;
        const originalUrl = (req as { originalUrl?: string }).originalUrl ?? req.url;

        // Ensure outbound path is the full public path (query string included).
        proxyReq.path = originalUrl;

        logger.info('Gateway proxy → upstream', {
          stage: 'gateway-proxy',
          correlationId,
          method: req.method,
          originalUrl,
          target,
          outbound: `${target}${originalUrl}`,
          proxyReqPath: proxyReq.path,
        });

        if (correlationId) {
          proxyReq.setHeader('x-correlation-id', correlationId);
        }
        if (req.headers.authorization) {
          proxyReq.setHeader('authorization', req.headers.authorization);
        }
      },
      proxyRes: (proxyRes, req) => {
        logger.info('Gateway proxy ← upstream', {
          stage: 'gateway-proxy',
          correlationId: (req as { correlationId?: string }).correlationId,
          method: req.method,
          originalUrl: (req as { originalUrl?: string }).originalUrl,
          upstreamStatus: proxyRes.statusCode,
        });
      },
      error: (err, req, res) => {
        logger.error('Upstream proxy error', {
          stage: 'gateway-proxy',
          target,
          path: (req as { originalUrl?: string }).originalUrl,
          error: err.message,
        });
        const response = res as import('http').ServerResponse;
        if (!response.headersSent) {
          response.writeHead(502, { 'Content-Type': 'application/json' });
          response.end(
            JSON.stringify({
              success: false,
              message: 'Upstream service unavailable',
              error: { code: 'BAD_GATEWAY' },
            }),
          );
        }
      },
    },
  });
}
