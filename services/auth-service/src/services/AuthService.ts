import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  AuthTokens,
  ConflictError,
  ForbiddenError,
  JwtService,
  NotFoundError,
  parseExpiryToSeconds,
  TokenType,
  UnauthorizedError,
  UserRole,
} from '@uhg-haas/shared';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  lastLoginAt: Date | null;
}

export class AuthService {
  private readonly userRepo: Repository<User>;
  private readonly refreshTokenRepo: Repository<RefreshToken>;
  private readonly jwtService: JwtService;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
    this.refreshTokenRepo = AppDataSource.getRepository(RefreshToken);
    this.jwtService = new JwtService({
      secret: env.JWT_SECRET,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });
  }

  async register(input: RegisterInput): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    logger.info('AuthService.register start', { stage: 'service', email: input.email });
    const existing = await this.userRepo.findOne({ where: { email: input.email } });
    if (existing) {
      logger.warn('AuthService.register conflict', { stage: 'service', email: input.email });
      throw new ConflictError('Email is already registered');
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS),
        firstName: input.firstName,
        lastName: input.lastName,
        role: UserRole.USER,
        isActive: true,
      }),
    );

    logger.info('AuthService.register saved user', { stage: 'service', userId: user.id });
    return { user: this.toDto(user), tokens: await this.issueTokens(user) };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthUserDto; tokens: AuthTokens }> {
    logger.info('AuthService.login start', { stage: 'service', email });
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      logger.warn('AuthService.login invalid credentials', { stage: 'service', email });
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return { user: this.toDto(user), tokens: await this.issueTokens(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = this.jwtService.verify(refreshToken, TokenType.REFRESH);
    const stored = await this.refreshTokenRepo.findOne({
      where: { jti: payload.jti },
      relations: ['user'],
    });

    // Reuse of a revoked/unknown refresh token → revoke all sessions for that user
    if (!stored || !stored.isActive) {
      if (stored?.userId) {
        await this.revokeAllUserTokens(stored.userId);
      }
      throw new UnauthorizedError('Refresh token is invalid or revoked', 'INVALID_REFRESH_TOKEN');
    }

    if (!stored.user.isActive) {
      throw new ForbiddenError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    stored.revokedAt = new Date();
    await this.refreshTokenRepo.save(stored);

    return this.issueTokens(stored.user);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(refreshToken, TokenType.REFRESH);
      await this.refreshTokenRepo.update({ jti: payload.jti }, { revokedAt: new Date() });
    } catch {
      // Idempotent logout
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);
    await this.userRepo.save(user);
    await this.revokeAllUserTokens(userId);
  }

  async getProfile(userId: string): Promise<AuthUserDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.toDto(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const access = this.jwtService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refresh = this.jwtService.signRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        jti: refresh.jti,
        userId: user.id,
        expiresAt: new Date(Date.now() + parseExpiryToSeconds(env.JWT_REFRESH_EXPIRES_IN) * 1000),
        revokedAt: null,
      }),
    );

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresIn: parseExpiryToSeconds(env.JWT_ACCESS_EXPIRES_IN),
      tokenType: 'Bearer',
    };
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private toDto(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
