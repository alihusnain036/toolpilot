import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * Black-box tests for the no-backend guard.
 *
 * REQ-1 promises ToolPilot has no backend. The guard is what makes that
 * structurally true, so it needs its own tests: one that a clean tree passes,
 * and one per thing it is supposed to catch. Each case writes a small fixture
 * tree and runs the real script against it, so the test exercises the same code
 * path CI does.
 */

const GUARD = path.resolve('scripts/guard-no-backend.mjs');
const FIXTURE_PARENT = path.resolve('.tmp-guard-fixtures');

mkdirSync(FIXTURE_PARENT, { recursive: true });

afterAll(() => {
  rmSync(FIXTURE_PARENT, { recursive: true, force: true });
});

type Fixture = Record<string, string>;

/** Writes a fixture tree and returns what the guard says about it. */
function runGuard(files: Fixture): { code: number; output: string } {
  const root = mkdtempSync(path.join(FIXTURE_PARENT, 'tree-'));
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, 'utf8');
  }

  const result = spawnSync(process.execPath, [GUARD, root], {
    encoding: 'utf8',
  });

  return {
    code: result.status ?? -1,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

/** The minimum of a clean static app: a manifest and a prerendered page. */
const CLEAN: Fixture = {
  'package.json': JSON.stringify({
    name: 'fixture',
    dependencies: { next: '14.2.15', react: '18.3.1' },
  }),
  'app/page.tsx': 'export default function Page() {\n  return <p>hi</p>;\n}\n',
};

describe('no-backend guard', () => {
  it('passes a clean statically generated tree', () => {
    const { code, output } = runGuard(CLEAN);
    expect(output).toContain('no-backend guard passed');
    expect(code).toBe(0);
  });

  it('fails when a route handler is added', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'app/api/convert/route.ts':
        'export async function POST() {\n  return new Response("no");\n}\n',
    });
    expect(code).toBe(1);
    expect(output).toContain('no-backend guard FAILED');
    expect(output).toContain('route handler');
    expect(output).toContain('app/api/convert/route.ts');
  });

  it('fails when a pages API route is added', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'pages/api/upload.ts': 'export default function handler() {}\n',
    });
    expect(code).toBe(1);
    expect(output).toContain('pages API route');
  });

  it('fails when a server action is declared', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'app/actions.ts': "'use server';\n\nexport async function save() {}\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('use server');
  });

  it('fails when a route opts out of static rendering', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'app/tools/page.tsx':
        "export const dynamic = 'force-dynamic';\n\nexport default function Page() {\n  return null;\n}\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('force-dynamic');
  });

  it('fails when a server runtime is declared', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'app/tools/page.tsx':
        "export const runtime = 'edge';\n\nexport default function Page() {\n  return null;\n}\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('export const runtime');
  });

  it('fails when request headers or cookies are read', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'app/tools/page.tsx':
        "import { headers } from 'next/headers';\n\nexport default function Page() {\n  return <p>{headers().get('host')}</p>;\n}\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('next/headers');
  });

  it('fails when a database client is imported', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'src/lib/db.ts':
        "import { PrismaClient } from '@prisma/client';\n\nexport const db = new PrismaClient();\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('@prisma/client');
  });

  it('fails when an object store client is imported dynamically', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'src/lib/store.ts':
        "export const put = async () => (await import('@aws-sdk/client-s3')).S3Client;\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('@aws-sdk/client-s3');
  });

  it('fails when an upload handler is imported', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'src/lib/upload.ts':
        "const multer = require('multer');\nexport default multer;\n",
    });
    expect(code).toBe(1);
    expect(output).toContain('multer');
  });

  it('fails when a database package is merely declared in package.json', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'package.json': JSON.stringify({
        name: 'fixture',
        dependencies: { next: '14.2.15', pg: '8.12.0' },
      }),
    });
    expect(code).toBe(1);
    expect(output).toContain('dependencies.pg');
  });

  it('fails when server-runtime middleware is added', () => {
    const { code, output } = runGuard({
      ...CLEAN,
      'middleware.ts': 'export function middleware() {}\n',
    });
    expect(code).toBe(1);
    expect(output).toContain('middleware');
  });

  it('explains why each violation is a violation', () => {
    const { output } = runGuard({
      ...CLEAN,
      'app/api/x/route.ts': 'export function GET() {}\n',
    });
    expect(output).toContain('v1 has no backend');
    expect(output).toContain('docs/decisions/0001-no-backend.md');
  });
});
