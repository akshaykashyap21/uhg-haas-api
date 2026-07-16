#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensures `node_modules/@uhg-haas/shared/dist` exists for local dev.
// This prevents runtime failures when the shared package is installed from a registry
// without build artifacts (JFrog "files" curation / missing dist).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const localDist = path.join(root, 'packages', 'shared', 'dist');
const nodeSharedPkg = path.join(root, 'node_modules', '@uhg-haas', 'shared');
const nodeDist = path.join(nodeSharedPkg, 'dist');

if (!fs.existsSync(localDist)) {
  // Nothing we can do without a local build.
  process.exit(0);
}

if (!fs.existsSync(nodeSharedPkg)) {
  // With proper workspaces, this usually doesn't exist yet (or is symlinked).
  process.exit(0);
}

fs.mkdirSync(nodeDist, { recursive: true });

// Node 16+ supports fs.cpSync. Use it to copy dist contents.
try {
  fs.cpSync(localDist, nodeDist, { recursive: true, force: true });
} catch (err) {
  // If cpSync isn't available, fallback to no-op.
  // eslint-disable-next-line no-console
  console.warn('ensure-shared-in-node-modules: copy failed', err);
}

process.exit(0);

