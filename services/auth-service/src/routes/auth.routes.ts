import { Router } from 'express';
import { authenticate, createRateLimiter, JwtService, validate } from '@uhg-haas/shared';
import { env } from '../config/env';
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
