import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function findMonorepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'env')) && fs.existsSync(path.join(dir, 'package.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as {
        workspaces?: unknown;
      };
      if (pkg.workspaces) {
        return dir;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function resolveEnvKey(appEnv: string): string {
  if (appEnv === 'dev' || appEnv === 'development') return 'development';
  if (appEnv === 'stage' || appEnv === 'staging') return 'staging';
  if (appEnv === 'prod' || appEnv === 'production') return 'production';
  return 'development';
}

/**
 * Loads `env/{serviceName}.{environment}.env` from monorepo root.
 */
export function loadDotenv(serviceName: string, cwd = process.cwd()): string {
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const envKey = resolveEnvKey(appEnv);
  const root = findMonorepoRoot(cwd);
  const fileName = `${serviceName}.${envKey}.env`;
  const fullPath = path.join(root, 'env', fileName);

  if (!fs.existsSync(fullPath)) {
    throw new Error(
      `Env file not found: ${fullPath}\n` +
        `Create it from env/${serviceName}.development.env template or copy from a teammate.`,
    );
  }

  dotenv.config({ path: fullPath, override: true });
  return fullPath;
}
