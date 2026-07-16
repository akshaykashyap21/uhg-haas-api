import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * Resolve the service package root (directory with package.json that is not the monorepo root).
 */
function findServiceRoot(start: string): string {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { workspaces?: unknown };
      if (!pkg.workspaces) {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(start);
}

function resolveEnvFileName(appEnv: string): string {
  if (appEnv === 'stage' || appEnv === 'staging') return '.env.staging';
  if (appEnv === 'prod' || appEnv === 'production') return '.env.production';
  return '.env';
}

/**
 * Loads env for the current service from its own directory:
 * - development → `.env`
 * - staging     → `.env.staging`
 * - production  → `.env.production`
 */
export function loadDotenv(cwd = process.cwd()): string {
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const fileName = resolveEnvFileName(appEnv);
  const serviceRoot = findServiceRoot(cwd);
  const fullPath = path.join(serviceRoot, fileName);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Env file not found: ${fullPath}\n` +
        `Create ${fileName} in the service folder (copy from .env for local/dev).`,
    );
  }

  dotenv.config({ path: fullPath, override: true });
  return fullPath;
}
