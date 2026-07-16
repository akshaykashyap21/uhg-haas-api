#!/usr/bin/env node
/**
 * Align workspace package versions with root package.json (JFrog publish expects SemVer lockstep).
 * Usage: node scripts/sync-versions.mjs [version]
 *   With no arg: sync all workspaces to root version.
 *   With arg: set root + all workspaces to that version (e.g. 1.0.1).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaces = [
  'package.json',
  'packages/shared/package.json',
  'services/auth-service/package.json',
  'services/api-gateway/package.json',
];

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const targetVersion = process.argv[2] || rootPkg.version;

rootPkg.version = targetVersion;
fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify(rootPkg, null, 2)}\n`);

for (const rel of workspaces.slice(1)) {
  const filePath = path.join(root, rel);
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  pkg.version = targetVersion;
  if (pkg.dependencies?.['@uhg-haas/shared']) {
    pkg.dependencies['@uhg-haas/shared'] = targetVersion;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

console.log(`Synced workspace versions to ${targetVersion}`);
