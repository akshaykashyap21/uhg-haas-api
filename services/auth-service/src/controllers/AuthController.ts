import { Request, Response } from 'express';
import { asyncHandler, sendSuccess } from '@uhg-haas/shared';
import { logger } from '../config/logger';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private service?: AuthService;

  private get authService(): AuthService {
    if (!this.service) {
      this.service = new AuthService();
    }
    return this.service;
  }

  register = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Auth controller register', {
      stage: 'controller',
      correlationId: req.correlationId,
      email: req.body?.email,
    });
    const result = await this.authService.register(req.body);
    logger.info('Auth controller register done', {
      stage: 'controller',
      correlationId: req.correlationId,
      userId: result.user.id,
    });
    return sendSuccess(res, result, 'User registered successfully', 201, req.correlationId);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Auth controller login', {
      stage: 'controller',
      correlationId: req.correlationId,
      email: req.body?.email,
    });
    const result = await this.authService.login(req.body.email, req.body.password);
    logger.info('Auth controller login done', {
      stage: 'controller',
      correlationId: req.correlationId,
      userId: result.user.id,
    });
    return sendSuccess(res, result, 'Login successful', 200, req.correlationId);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Auth controller refresh', {
      stage: 'controller',
      correlationId: req.correlationId,
    });
    const tokens = await this.authService.refresh(req.body.refreshToken);
    logger.info('Auth controller refresh done', {
      stage: 'controller',
      correlationId: req.correlationId,
    });
    return sendSuccess(res, tokens, 'Token refreshed', 200, req.correlationId);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Auth controller logout', {
      stage: 'controller',
      correlationId: req.correlationId,
    });
    await this.authService.logout(req.body.refreshToken);
    logger.info('Auth controller logout done', {
      stage: 'controller',
      correlationId: req.correlationId,
    });
    return sendSuccess(res, null, 'Logged out successfully', 200, req.correlationId);
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Auth controller me', {
      stage: 'controller',
      correlationId: req.correlationId,
      userId: req.user?.id,
    });
    const profile = await this.authService.getProfile(req.user!.id);
    return sendSuccess(res, profile, 'Profile retrieved', 200, req.correlationId);
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    logger.info('Auth controller change-password', {
      stage: 'controller',
      correlationId: req.correlationId,
      userId: req.user?.id,
    });
    await this.authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    logger.info('Auth controller change-password done', {
      stage: 'controller',
      correlationId: req.correlationId,
      userId: req.user?.id,
    });
    return sendSuccess(res, null, 'Password changed successfully', 200, req.correlationId);
  });
}
