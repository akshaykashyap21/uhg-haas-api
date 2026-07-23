#!/usr/bin/env node
/**
 * Ensures @uhg-haas/shared resolves from node_modules after rename from @app/*
 * or when workspace links are missing.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localPkg = path.join(root, 'packages', 'shared');
const localDist = path.join(localPkg, 'dist');
const scopeDir = path.join(root, 'node_modules', '@uhg-haas');
const nodePkg = path.join(scopeDir, 'shared');

if (!fs.existsSync(path.join(localDist, 'index.js'))) {
  console.error('Missing packages/shared/dist — run: npm run build:shared');
  process.exit(1);
}

function linkShared() {
  fs.mkdirSync(scopeDir, { recursive: true });
  if (fs.existsSync(nodePkg)) {
    fs.rmSync(nodePkg, { recursive: true, force: true });
  }
  const target = path.relative(scopeDir, localPkg);
  try {
    fs.symlinkSync(target, nodePkg, 'junction');
    console.log('Linked node_modules/@uhg-haas/shared -> packages/shared');
  } catch (err) {
    // Fallback: copy package (slower, works without symlink privileges)
    fs.cpSync(localPkg, nodePkg, { recursive: true });
    console.log('Copied packages/shared into node_modules/@uhg-haas/shared');
  }
}

if (!fs.existsSync(nodePkg)) {
  linkShared();
  process.exit(0);
}

try {
  if (fs.realpathSync(localPkg) === fs.realpathSync(nodePkg)) {
    process.exit(0);
  }
} catch {
  // broken link — recreate
}

const nodeDist = path.join(nodePkg, 'dist');
const isSymlink =
  fs.existsSync(nodePkg) &&
  (fs.lstatSync(nodePkg).isSymbolicLink() || fs.lstatSync(nodePkg).isDirectory());

if (isSymlink) {
  try {
    if (fs.realpathSync(localPkg) !== fs.realpathSync(nodePkg)) {
      linkShared();
    }
  } catch {
    linkShared();
  }
  process.exit(0);
}

fs.mkdirSync(nodeDist, { recursive: true });
fs.cpSync(localDist, nodeDist, { recursive: true, force: true });
