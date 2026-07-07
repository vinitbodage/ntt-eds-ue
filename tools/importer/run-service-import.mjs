/**
 * Run Import as a Service with xwalk (Universal Editor) options.
 * Requires AEM_IMPORT_API_KEY in the environment or .env file.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const options = readFileSync(path.join(__dirname, 'xwalk-options.json'), 'utf8');

const args = [
  'aem-import-helper',
  'import',
  '--urls', path.join(__dirname, 'urls.txt'),
  '--importjs', path.join(__dirname, 'import.js'),
  '--options', options,
  '--models', path.join(root, 'component-models.json'),
  '--filters', path.join(root, 'component-filters.json'),
  '--definitions', path.join(root, 'component-definition.json'),
];

const result = spawnSync('npx', args, { stdio: 'inherit', shell: true, cwd: root });
process.exit(result.status ?? 1);
