import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

describe('published package entrypoints', () => {
  beforeAll(() => {
    run('pnpm', ['run', 'clean']);
    run('pnpm', ['run', 'build']);
  }, 30000);

  afterAll(() => {
    rmSync(join(rootDir, 'dist-smoke'), { recursive: true, force: true });
  });

  test('loads createMockBridge from ESM import and CJS require', () => {
    const smokeDir = join(rootDir, 'dist-smoke');
    mkdirSync(smokeDir, { recursive: true });

    const cjsSmoke = join(smokeDir, 'require-smoke.cjs');
    writeFileSync(
      cjsSmoke,
      [
        "const entry = require('@bagaking/dma-frame');",
        "if (typeof entry.createMockBridge !== 'function') throw new Error('missing createMockBridge');",
        "if (typeof entry.default !== 'function') throw new Error('missing default export');"
      ].join('\n')
    );

    run('node', [cjsSmoke]);
    run('node', [
      '--input-type=module',
      '--eval',
      [
        "const entry = await import('@bagaking/dma-frame');",
        "if (typeof entry.createMockBridge !== 'function') throw new Error('missing createMockBridge');",
        "if (typeof entry.default !== 'function') throw new Error('missing default export');"
      ].join('\n')
    ]);
  });

  test('npm pack dry-run includes the published entry files', () => {
    const packOutput = run('npm', ['pack', '--dry-run', '--json']);
    const [pack] = JSON.parse(packOutput) as Array<{ files: Array<{ path: string }> }>;
    if (!pack) {
      throw new Error('npm pack did not return package metadata');
    }

    const paths = new Set(pack.files.map((file) => file.path));

    expect(paths.has('dist/index.cjs')).toBe(true);
    expect(paths.has('dist/index.esm.js')).toBe(true);
    expect(paths.has('dist/index.d.ts')).toBe(true);
  });
});
