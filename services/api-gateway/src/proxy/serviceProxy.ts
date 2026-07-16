import { RequestHandler } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { Logger } from 'winston';

/**
 * Proxies gateway routes to an upstream service.
 * Auth and gateway share the same public path (e.g. /api/v1/auth),
 * so we forward `originalUrl` as-is — do not prefix again.
 */
export function createServiceProxy(
  target: string,
  _upstreamBasePath: string,
  logger: Logger,
): RequestHandler {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (_path, req) => {
      const original = (req as { originalUrl?: string }).originalUrl ?? _path;
      return original;
    },
    proxyTimeout: 30000,
    timeout: 30000,
    on: {
      proxyReq: (proxyReq, req) => {
        const correlationId = (req as { correlationId?: string }).correlationId;
        const originalUrl = (req as { originalUrl?: string }).originalUrl;
        const forwardedPath = proxyReq.path;

        logger.info('Gateway proxy → upstream', {
          stage: 'gateway-proxy',
          correlationId,
          method: req.method,
          originalUrl,
          target,
          forwardedPath,
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
