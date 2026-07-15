import jwt, { JwtPayload as LibJwtPayload, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { UnauthorizedError } from '../errors/AppError';
import { JwtPayload, TokenType, UserRole } from '../types/auth';

export interface JwtConfig {
  secret: string;
  issuer: string;
  audience: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface TokenPairInput {
  userId: string;
  email: string;
  role: UserRole;
}

export class JwtService {
  constructor(private readonly config: JwtConfig) {}

  signAccessToken(input: TokenPairInput): { token: string; expiresIn: string } {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: input.userId,
      email: input.email,
      role: input.role,
      type: TokenType.ACCESS,
      jti: uuidv4(),
    };

    const token = jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.accessExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    } as SignOptions);

    return { token, expiresIn: this.config.accessExpiresIn };
  }

  signRefreshToken(input: TokenPairInput): { token: string; jti: string } {
    const jti = uuidv4();
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: input.userId,
      email: input.email,
      role: input.role,
      type: TokenType.REFRESH,
      jti,
    };

    const token = jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.refreshExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    } as SignOptions);

    return { token, jti };
  }

  verify(token: string, expectedType?: TokenType): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as LibJwtPayload & JwtPayload;

      if (expectedType && decoded.type !== expectedType) {
        throw new UnauthorizedError('Invalid token type', 'INVALID_TOKEN_TYPE');
      }

      return {
        sub: decoded.sub as string,
        email: decoded.email,
        role: decoded.role,
        type: decoded.type,
        jti: decoded.jti,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      throw new UnauthorizedError('Invalid or expired token', 'INVALID_TOKEN');
    }
  }
}

export function parseExpiryToSeconds(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return 900;

  const value = Number(match[1]);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}
