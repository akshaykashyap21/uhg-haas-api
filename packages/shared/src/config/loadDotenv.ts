import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Loads env file by APP_ENV:
 *   development → .env
 *   staging     → .env.staging
 *   production  → .env.production
 */
export function loadDotenv(cwd = process.cwd()): string {
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();

  const fileByEnv: Record<string, string> = {
    development: '.env',
    dev: '.env',
    staging: '.env.staging',
    stage: '.env.staging',
    production: '.env.production',
    prod: '.env.production',
  };

  const fileName = fileByEnv[appEnv] || '.env';
  const fullPath = path.resolve(cwd, fileName);

  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath, override: true });
    return fullPath;
  }

  dotenv.config({ path: path.resolve(cwd, '.env') });
  return fileName;
}
