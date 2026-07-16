import { Request, Response } from 'express';
import { asyncHandler, sendSuccess } from '@uhg-haas/shared';
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
    console.log("request appeared!AKSHAY")
    const result = await this.authService.register(req.body);
    return sendSuccess(res, result, 'User registered successfully', 201, req.correlationId);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body.email, req.body.password);
    return sendSuccess(res, result, 'Login successful', 200, req.correlationId);
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const tokens = await this.authService.refresh(req.body.refreshToken);
    return sendSuccess(res, tokens, 'Token refreshed', 200, req.correlationId);
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.logout(req.body.refreshToken);
    return sendSuccess(res, null, 'Logged out successfully', 200, req.correlationId);
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const profile = await this.authService.getProfile(req.user!.id);
    return sendSuccess(res, profile, 'Profile retrieved', 200, req.correlationId);
  });

  changePassword = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    return sendSuccess(res, null, 'Password changed successfully', 200, req.correlationId);
  });
}
