#!/usr/bin/env node
/**
 * ToolPilot's no-backend guard.
 *
 * REQ-1 fixes the shape of v1: every route is statically generated at build
 * time and every tool runs in the visitor's browser. There is no API route, no
 * server action, no database, no object store and no upload endpoint. That
 * promise is only structurally true if something fails the build when one
 * appears — this is that something.
 *
 * Run with `pnpm guard`. CI runs it on every pull request and on main.
 *
 * Exits 0 when the repository is clean, 1 when a violation is found.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * The directory to check. Defaults to the working directory; an explicit root
 * can be passed as the first argument, which is how the guard's own tests point
 * it at a fixture tree.
 */
const explicitRoot = process.argv[2];
const repoRoot = path.resolve(explicitRoot ?? process.cwd());

/**
 * Files exempt from the *content* scan. The guard itself and its tests have to
 * be able to name the things they forbid. Nothing here is application code.
 */
const CONTENT_SCAN_EXEMPT = new Set([
  'scripts/guard-no-backend.mjs',
  'scripts/guard-no-backend.test.ts',
  '.eslintrc.json',
]);

/** Extensions whose contents are worth scanning. */
const SCANNED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
]);

/**
 * Server/database/storage client packages. Importing any of them means v1 has
 * grown a backend. Matched against the module specifier of an import or
 * require, so `@aws-sdk/client-s3/foo` is caught too.
 */
const FORBIDDEN_MODULES = [
  // Relational
  'pg',
  'pg-promise',
  'mysql',
  'mysql2',
  'sqlite3',
  'better-sqlite3',
  'oracledb',
  'tedious',
  'mssql',
  // ORMs and query builders
  'prisma',
  '@prisma/client',
  'drizzle-orm',
  'knex',
  'typeorm',
  'sequelize',
  'kysely',
  'mongoose',
  'mongodb',
  // Key/value and caches
  'redis',
  'ioredis',
  '@upstash/redis',
  '@vercel/kv',
  // Hosted data and storage platforms
  '@vercel/postgres',
  '@vercel/blob',
  '@planetscale/database',
  '@neondatabase/serverless',
  '@supabase/supabase-js',
  'firebase',
  'firebase-admin',
  '@aws-sdk/client-s3',
  '@aws-sdk/client-dynamodb',
  'aws-sdk',
  '@google-cloud/storage',
  '@azure/storage-blob',
  'minio',
  // Upload handling
  'multer',
  'busboy',
  'formidable',
  'express',
  'fastify',
  'koa',
  'uploadthing',
];

/**
 * Content rules. Each has a human-readable name, a matcher and the reason it
 * is forbidden, so a CI failure explains itself.
 */
const CONTENT_RULES = [
  {
    name: "'use server' directive",
    why: 'Server actions need a server. v1 has none; move the logic into a client component.',
    test: (text) =>
      findLines(text, /^\s*(['"])use server\1\s*;?\s*$/gm).concat(
        findLines(text, /(['"])use server\1/g).filter(Boolean),
      ),
  },
  {
    name: 'next/headers import',
    why: 'Reading request headers forces per-request server rendering; every v1 route must be prerendered.',
    test: (text) => findLines(text, /from\s+['"]next\/headers['"]/g),
  },
  {
    name: 'next/cookies import',
    why: 'Reading cookies forces per-request server rendering; per-visitor state lives in localStorage in v1.',
    test: (text) => findLines(text, /from\s+['"]next\/cookies['"]/g),
  },
  {
    name: "dynamic = 'force-dynamic'",
    why: 'Every v1 route is statically generated at build time.',
    test: (text) =>
      findLines(
        text,
        /export\s+const\s+dynamic\s*(?::[^=]+)?=\s*['"]force-dynamic['"]/g,
      ),
  },
  {
    name: 'export const runtime',
    why: 'Declaring a server runtime (node/edge) means the route is not static.',
    test: (text) => findLines(text, /export\s+const\s+runtime\s*(?::[^=]+)?=/g),
  },
  {
    name: 'unstable_noStore / connection',
    why: 'Opting a route out of static rendering contradicts the no-backend rule.',
    test: (text) =>
      findLines(text, /\b(unstable_noStore|unstable_after)\s*\(/g),
  },
  {
    name: 'database, storage or upload client import',
    why: 'v1 writes no server-side data and accepts no upload: all processing happens in the browser.',
    test: (text) => {
      const hits = [];
      const specifierPattern =
        /(?:from\s*|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
      for (const match of text.matchAll(specifierPattern)) {
        const specifier = match[1];
        if (!specifier) continue;
        const bare = specifier.startsWith('@')
          ? specifier.split('/').slice(0, 2).join('/')
          : specifier.split('/')[0];
        if (FORBIDDEN_MODULES.includes(bare)) {
          hits.push({
            line: lineOf(text, match.index ?? 0),
            detail: specifier,
          });
        }
      }
      return hits;
    },
  },
];

/** Path rules: a file existing at all is the violation. */
const PATH_RULES = [
  {
    name: 'Next.js route handler',
    why: 'A route handler is an API endpoint. v1 has no backend; there is nothing for it to do.',
    test: (file) => /^(?:src\/)?app\/.*\/?route\.(?:ts|tsx|js|jsx|mjs)$/.test(file),
  },
  {
    name: 'Next.js pages API route',
    why: 'A pages/api route is an API endpoint. v1 has no backend.',
    test: (file) => /^(?:src\/)?pages\/api\//.test(file),
  },
  {
    name: 'server-runtime middleware',
    why: 'Middleware runs per request on the edge runtime; v1 is served as static files from the CDN.',
    test: (file) => /^(?:src\/)?middleware\.(?:ts|tsx|js|mjs)$/.test(file),
  },
  {
    name: 'Next.js instrumentation hook',
    why: 'instrumentation.ts runs in a server process; v1 has none.',
    test: (file) => /^(?:src\/)?instrumentation\.(?:ts|js|mjs)$/.test(file),
  },
];

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function findLines(text, pattern) {
  const hits = [];
  for (const match of text.matchAll(pattern)) {
    hits.push({
      line: lineOf(text, match.index ?? 0),
      detail: (match[0] ?? '').trim(),
    });
  }
  return hits;
}

/** Directories never worth descending into. */
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  '.next',
  'out',
  'coverage',
  '.vercel',
]);

/**
 * Every file the guard should look at, as repo-relative POSIX paths.
 *
 * `git ls-files` is the right answer for a checkout: it sees exactly what would
 * be pushed and ignores build output. `--others --exclude-standard` includes
 * files that are new and not yet staged, so a developer running `pnpm guard`
 * before committing gets the same answer CI will give them afterwards; ignored
 * paths stay out either way.
 *
 * An explicitly named root is walked instead — it may be a fixture tree or an
 * exported tarball with no index of its own, and inheriting the surrounding
 * repository's file list would be wrong. The same walk is the fallback when git
 * is unavailable.
 */
function trackedFiles() {
  if (explicitRoot) {
    return walk(repoRoot, '');
  }
  try {
    const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return [...new Set(output.split('\0').filter(Boolean))];
  } catch {
    return walk(repoRoot, '');
  }
}

function walk(absolute, relative) {
  const found = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...walk(path.join(absolute, entry.name), childRelative));
    } else if (entry.isFile()) {
      found.push(childRelative);
    }
  }
  return found;
}

/**
 * package.json is checked separately: a forbidden package must not even be
 * declared as a dependency, whether or not any file imports it yet.
 */
function checkPackageJson(violations) {
  const pkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(pkgPath)) return;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const name of Object.keys(pkg[field] ?? {})) {
      if (FORBIDDEN_MODULES.includes(name)) {
        violations.push({
          file: 'package.json',
          line: 0,
          rule: 'database, storage or upload dependency',
          detail: `${field}.${name}`,
          why: 'v1 has no backend, so no database, storage or upload package belongs in the manifest.',
        });
      }
    }
  }
}

function main() {
  const files = trackedFiles();
  const violations = [];

  for (const file of files) {
    for (const rule of PATH_RULES) {
      if (rule.test(file)) {
        violations.push({
          file,
          line: 0,
          rule: rule.name,
          detail: file,
          why: rule.why,
        });
      }
    }
  }

  for (const file of files) {
    if (CONTENT_SCAN_EXEMPT.has(file)) continue;
    if (!SCANNED_EXTENSIONS.has(path.extname(file))) continue;
    if (file === 'package.json') continue;

    const absolute = path.join(repoRoot, file);
    if (!existsSync(absolute)) continue;

    const text = readFileSync(absolute, 'utf8');
    for (const rule of CONTENT_RULES) {
      for (const hit of rule.test(text)) {
        violations.push({
          file,
          line: hit.line,
          rule: rule.name,
          detail: hit.detail,
          why: rule.why,
        });
      }
    }
  }

  checkPackageJson(violations);

  if (violations.length > 0) {
    const seen = new Set();
    console.error('\nno-backend guard FAILED\n');
    for (const v of violations) {
      const key = `${v.file}:${v.line}:${v.rule}:${v.detail}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const where = v.line > 0 ? `${v.file}:${v.line}` : v.file;
      console.error(`  ✖ ${where}`);
      console.error(`    ${v.rule} — ${v.detail}`);
      console.error(`    ${v.why}\n`);
    }
    console.error(
      `${seen.size} violation(s). ToolPilot v1 is a static, browser-only site: ` +
        'see docs/decisions/0001-no-backend.md.\n',
    );
    process.exit(1);
  }

  console.log(
    `no-backend guard passed — ${files.length} tracked file(s) checked, no ` +
      'route handler, server action, server runtime, database or upload client found.',
  );
}

main();
