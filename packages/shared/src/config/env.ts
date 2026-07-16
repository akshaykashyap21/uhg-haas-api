import Joi from 'joi';

export interface AppEnv {
  NODE_ENV: 'development' | 'test' | 'staging' | 'production';
  PORT: number;
  SERVICE_NAME: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
  LOG_LEVEL: string;
}

export interface JwtEnv {
  JWT_SECRET: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
}

export interface SqlEnv {
  AZURE_SQL_HOST: string;
  AZURE_SQL_PORT: number;
  AZURE_SQL_DATABASE: string;
  AZURE_SQL_WINDOWS_AUTH: boolean;
  AZURE_SQL_USER: string;
  AZURE_SQL_PASSWORD: string;
  AZURE_SQL_ENCRYPT: boolean;
  AZURE_SQL_TRUST_SERVER_CERTIFICATE: boolean;
  TYPEORM_SYNC: boolean;
  TYPEORM_LOGGING: boolean;
}

export type ServiceEnv = AppEnv & JwtEnv & SqlEnv;

const appSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().port().required(),
  SERVICE_NAME: Joi.string().required(),
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: Joi.number().default(100),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),
});

const jwtSchema = Joi.object({
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().default('azure-express-api'),
  JWT_AUDIENCE: Joi.string().default('azure-express-clients'),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
});

const sqlSchema = Joi.object({
  AZURE_SQL_HOST: Joi.string().required(),
  AZURE_SQL_PORT: Joi.number().default(1433),
  AZURE_SQL_DATABASE: Joi.string().required(),
  AZURE_SQL_WINDOWS_AUTH: Joi.boolean().default(false),
  AZURE_SQL_USER: Joi.when('AZURE_SQL_WINDOWS_AUTH', {
    is: true,
    then: Joi.string().allow('').optional(),
    otherwise: Joi.string().required(),
  }),
  AZURE_SQL_PASSWORD: Joi.when('AZURE_SQL_WINDOWS_AUTH', {
    is: true,
    then: Joi.string().allow('').optional(),
    otherwise: Joi.string().required(),
  }),
  AZURE_SQL_ENCRYPT: Joi.boolean().default(true),
  AZURE_SQL_TRUST_SERVER_CERTIFICATE: Joi.boolean().default(false),
  TYPEORM_SYNC: Joi.boolean().default(false),
  TYPEORM_LOGGING: Joi.boolean().default(false),
});

function validateEnv<T>(schema: Joi.ObjectSchema): T {
  const { value, error } = schema
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(process.env, { allowUnknown: true, convert: true });

  if (error) {
    throw new Error(
      `Environment validation failed: ${error.details.map((d) => d.message).join('; ')}`,
    );
  }

  return value as T;
}

/** HTTP edge services without DB/JWT (e.g. gateway). */
export function loadAppEnv<T extends AppEnv = AppEnv>(
  overrides: Joi.ObjectSchema = Joi.object({}),
): T {
  return validateEnv<T>(appSchema.concat(overrides));
}

/** Domain services with JWT + Azure SQL. */
export function loadServiceEnv<T extends ServiceEnv = ServiceEnv>(
  overrides: Joi.ObjectSchema = Joi.object({}),
): T {
  return validateEnv<T>(appSchema.concat(jwtSchema).concat(sqlSchema).concat(overrides));
}
