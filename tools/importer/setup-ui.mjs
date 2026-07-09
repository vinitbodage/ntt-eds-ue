/* eslint-disable no-console */
/**
 * Ensures helix-importer-ui is present for `aem import`.
 * The AEM CLI clones this repo on first run; a failed clone leaves an empty
 * folder and causes "Could not find HEAD" on retry.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const importDir = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(importDir, 'helix-importer-ui');
const UI_REPO = 'https://github.com/adobe/helix-importer-ui';

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

if (fs.existsSync(path.join(UI_DIR, 'index.html'))) {
  console.log('AEM Importer UI already installed.');
  process.exit(0);
}

if (fs.existsSync(UI_DIR)) {
  console.log('Removing incomplete AEM Importer UI folder...');
  removeDir(UI_DIR);
}

console.log(`Cloning AEM Importer UI into ${UI_DIR}...`);
const result = spawnSync(
  'git',
  ['clone', '--depth', '1', UI_REPO, UI_DIR],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
