import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve('dist-test');
rmSync(outDir, { recursive: true, force: true });
const tscBin = resolve('node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

const tsc = spawnSync(
  tscBin,
  [
    '--outDir',
    'dist-test',
    '--module',
    'commonjs',
    '--moduleResolution',
    'node',
    '--target',
    'ES2020',
    '--lib',
    'ES2020,DOM',
    '--jsx',
    'react-jsx',
    '--esModuleInterop',
    '--skipLibCheck',
    'src/lib/pattern-trend-enrichment.test-runner.ts',
  ],
  { stdio: 'inherit', shell: process.platform === 'win32' },
);

if (tsc.error) {
  console.error(tsc.error);
  process.exit(1);
}
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

const node = spawnSync(
  process.execPath,
  ['dist-test/lib/pattern-trend-enrichment.test-runner.js'],
  { stdio: 'inherit', shell: false },
);

if (node.error) {
  console.error(node.error);
  process.exit(1);
}
process.exit(node.status ?? 1);
