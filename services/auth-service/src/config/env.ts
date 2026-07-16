import Joi from 'joi';
import { loadDotenv, loadServiceEnv, ServiceEnv } from '@uhg-haas/shared';

loadDotenv('auth-service');

export interface AuthServiceEnv extends ServiceEnv {
  BCRYPT_SALT_ROUNDS: number;
}

export const env = loadServiceEnv<AuthServiceEnv>(
  Joi.object({
    BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(14).default(12),
  }),
);
