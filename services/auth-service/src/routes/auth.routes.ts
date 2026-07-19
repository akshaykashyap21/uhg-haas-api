import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, createRateLimiter, JwtService, validate } from '@uhg-haas/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppDataSource } from '../config/data-source';
import { AuthController } from '../controllers/AuthController';
import {
  changePasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '../validation/auth.schemas';

const router = Router();
const controller = new AuthController();
const jwtService = new JwtService({
  secret: env.JWT_SECRET,
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
});

const authLimiter = createRateLimiter(15 * 60 * 1000, 20);

/** Logs as soon as a request hits /api/v1/auth/* (before validation). */
function traceAuthRoute(req: Request, _res: Response, next: NextFunction): void {
  logger.info('Auth API route reached', {
    stage: 'route',
    correlationId: req.correlationId,
    method: req.method,
    originalUrl: req.originalUrl,
    mountPath: req.baseUrl,
    routePath: req.path,
    hasBody: Boolean(req.body && Object.keys(req.body).length),
    bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
  });
  next();
}

router.use(traceAuthRoute);

/** Liveness under the proxied prefix (gateway-friendly). */
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

router.get(['/ping', '/__ping', '/_ping'], (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'auth-service',
    path: '/api/v1/auth/ping',
  });
});

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshTokenSchema), controller.refresh);
router.post('/logout', validate(refreshTokenSchema), controller.logout);
router.get('/me', authenticate(jwtService), controller.me);
router.post(
  '/change-password',
  authenticate(jwtService),
  validate(changePasswordSchema),
  controller.changePassword,
);

export default router;
