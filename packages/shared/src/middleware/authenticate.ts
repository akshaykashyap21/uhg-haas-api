import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError';
import { AuthenticatedRequestUser, TokenType, UserRole } from '../types/auth';
import { JwtService } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedRequestUser;
    }
  }
}

export function authenticate(jwtService: JwtService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      next(new UnauthorizedError('Missing or invalid Authorization header'));
      return;
    }

    const token = header.slice(7).trim();
    if (!token) {
      next(new UnauthorizedError('Missing access token'));
      return;
    }

    try {
      const payload = jwtService.verify(token, TokenType.ACCESS);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        jti: payload.jti,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}
