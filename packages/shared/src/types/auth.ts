export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum TokenType {
  ACCESS = 'ACCESS',
  REFRESH = 'REFRESH',
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: TokenType;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: UserRole;
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
  meta?: {
    correlationId: string;
    timestamp: string;
  };
}
