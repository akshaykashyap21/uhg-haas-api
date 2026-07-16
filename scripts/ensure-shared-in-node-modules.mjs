#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localPkg = path.join(root, 'packages', 'shared');
const localDist = path.join(localPkg, 'dist');
const nodePkg = path.join(root, 'node_modules', '@uhg-haas', 'shared');

if (!fs.existsSync(path.join(localDist, 'index.js'))) {
  console.error('Missing packages/shared/dist — run: npm run build:shared');
  process.exit(1);
}

if (!fs.existsSync(nodePkg)) {
  // Workspaces may resolve @uhg-haas/shared without a node_modules folder entry.
  process.exit(0);
}

try {
  if (fs.realpathSync(localPkg) === fs.realpathSync(nodePkg)) {
    // Workspace symlink — same package, no copy needed.
    process.exit(0);
  }
} catch {
  process.exit(0);
}

const nodeDist = path.join(nodePkg, 'dist');
fs.mkdirSync(nodeDist, { recursive: true });
fs.cpSync(localDist, nodeDist, { recursive: true, force: true });
