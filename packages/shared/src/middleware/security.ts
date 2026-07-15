import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { RequestHandler } from 'express';
import { TooManyRequestsError } from '../errors/AppError';

export function securityHeaders(): RequestHandler {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
}

export function corsMiddleware(origin: string): RequestHandler {
  const origins = origin === '*' ? true : origin.split(',').map((o) => o.trim());
  return cors({
    origin: origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
  });
}

export function createRateLimiter(windowMs: number, max: number): RequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError());
    },
  });
}
