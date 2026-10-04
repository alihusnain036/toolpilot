#!/usr/bin/env node
/**
 * ToolPilot's dependency licence check.
 *
 * REQ-1: every runtime dependency must be permissively licensed. This script
 * lists each production dependency — direct and transitive — with its licence,
 * and exits non-zero if any licence falls outside the allow-list, so a copyleft
 * dependency cannot be merged by accident.
 *
 * Two tools do two jobs here:
 *
 *  - `pnpm list --prod --depth Infinity --json` enumerates the production tree.
 *    pnpm installs into a symlinked virtual store (node_modules/.pnpm/...), and
 *    a plain node_modules walk only ever finds the handful of direct
 *    dependencies — it would miss every transitive one. pnpm is the only thing
 *    that knows the real shape of its own tree.
 *  - `license-checker-rseidelsohn` reads the licence of each package pnpm
 *    reported, pointed at that package's directory in the store.
 *
 * Run with `pnpm licences`. CI runs it on every pull request and on main.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * license-checker is loaded on first use rather than at import time: the
 * allow-list and the expression evaluator below are unit-tested by importing
 * this module, and those tests should not have to load a package that walks
 * the filesystem.
 */
let cachedInit;
function licenseChecker() {
  cachedInit ??= require('license-checker-rseidelsohn').init;
  return cachedInit;
}

/**
 * SPDX identifiers permitted for production dependencies. Each is permissive:
 * no copyleft obligation attaches to shipping ToolPilot's static bundle.
 */
export const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
]);

/**
 * Named exceptions to the allow-list.
 *
 * An exception is only honoured when the package's declared licence still
 * matches `licence` exactly, so a version bump that changes the licence fails
 * the check again instead of inheriting the exemption. Each entry needs a
 * reason a reviewer can check. See docs/decisions/0003-dependency-licences.md.
 */
export const EXCEPTIONS = new Map([
  [
    'caniuse-lite',
    {
      licence: 'CC-BY-4.0',
      reason:
        'Browser-support data table pulled in by Next 14 via its own ' +
        'browserslist dependency; it cannot be removed without removing Next. ' +
        'CC-BY-4.0 is an attribution licence over data, not a copyleft code ' +
        'licence, and the data is read at build time to compute compilation ' +
        'targets — none of it reaches the shipped bundle.',
    },
  ],
]);

/**
 * Splits a compound SPDX expression ("(MIT OR Apache-2.0)", "MIT AND ISC")
 * into its parts along with how they combine.
 *
 * - An OR expression is satisfied if ANY branch is allowed (we may choose it).
 * - An AND expression is satisfied only if EVERY branch is allowed.
 */
export function evaluateExpression(raw) {
  const expression = String(raw ?? '')
    .replace(/^\(+|\)+$/g, '')
    .trim();

  if (expression === '') {
    return { ok: false, parts: [], reason: 'no licence declared' };
  }

  // license-checker marks a guessed licence with a trailing '*'.
  const normalise = (part) => part.replace(/\*$/, '').trim();

  if (/\sOR\s/i.test(expression)) {
    const parts = expression.split(/\s+OR\s+/i).map(normalise);
    return { ok: parts.some((part) => ALLOWED.has(part)), parts };
  }

  if (/\sAND\s/i.test(expression)) {
    const parts = expression.split(/\s+AND\s+/i).map(normalise);
    return { ok: parts.every((part) => ALLOWED.has(part)), parts };
  }

  const single = normalise(expression);
  return { ok: ALLOWED.has(single), parts: [single] };
}

/**
 * The verdict on one package: 'allowed' when its licence is on the allow-list,
 * 'excepted' when it is not but a recorded exception names this package at
 * exactly this licence, 'disallowed' otherwise.
 */
export function verdictFor(name, licence) {
  if (evaluateExpression(licence).ok) {
    return { outcome: 'allowed' };
  }
  const exception = EXCEPTIONS.get(name);
  if (exception && exception.licence === String(licence ?? '').trim()) {
    return { outcome: 'excepted', reason: exception.reason };
  }
  return { outcome: 'disallowed' };
}

/**
 * Asks pnpm for every production dependency, at any depth, and returns one
 * entry per unique name@version with the directory it is installed in.
 */
function enumerateProductionTree() {
  let raw;
  try {
    raw = execFileSync(
      'pnpm',
      ['list', '--prod', '--depth', 'Infinity', '--json'],
      {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (error) {
    console.error(
      'licence check could not enumerate the dependency tree with pnpm.\n' +
        'This repository is pinned to pnpm (see "packageManager" in package.json);\n' +
        'run `corepack enable pnpm` and `pnpm install`, then try again.\n',
    );
    console.error(error.stderr?.toString?.() ?? error.message);
    process.exit(1);
  }

  const projects = JSON.parse(raw);
  const found = new Map();

  const walk = (dependencies) => {
    for (const [name, info] of Object.entries(dependencies ?? {})) {
      if (!info || typeof info !== 'object') continue;
      // A dependency pnpm could not resolve has no version; surface it rather
      // than skipping it, because an unresolved package has no known licence.
      const version = info.version ?? '';
      const key = `${name}@${version}`;
      if (found.has(key)) continue;
      found.set(key, { name, version, path: info.path ?? null });
      walk(info.dependencies);
    }
  };

  for (const project of Array.isArray(projects) ? projects : [projects]) {
    walk(project.dependencies);
    // `--prod` already excludes devDependencies; optional production
    // dependencies still ship, so they count too.
    walk(project.optionalDependencies);
  }

  return [...found.values()].sort((a, b) =>
    a.name === b.name
      ? a.version.localeCompare(b.version)
      : a.name.localeCompare(b.name),
  );
}

/**
 * Reads one installed package's licence with license-checker, scoped to the
 * directory pnpm reported. `direct: 0` keeps it to that package alone.
 */
function readLicence(packageDir) {
  return new Promise((resolve) => {
    if (!packageDir) {
      resolve({ licence: '', repository: '' });
      return;
    }
    licenseChecker()(
      {
        start: packageDir,
        direct: 0,
        production: false,
        excludePrivatePackages: false,
        unknown: false,
      },
      (error, packages) => {
        if (error) {
          resolve({ licence: '', repository: '', error: error.message });
          return;
        }
        const first = Object.values(packages ?? {})[0];
        if (!first) {
          resolve({ licence: '', repository: '' });
          return;
        }
        const licence = Array.isArray(first.licenses)
          ? first.licenses.join(' AND ')
          : (first.licenses ?? '');
        resolve({ licence, repository: first.repository ?? '' });
      },
    );
  });
}

async function main() {
  const tree = enumerateProductionTree();

  if (tree.length === 0) {
    console.error(
      'licence check found no production dependencies — that is almost ' +
        'certainly a broken dependency tree, not an empty one. Run `pnpm install`.',
    );
    process.exit(1);
  }

  const installed = [];
  const notInstalled = [];

  for (const node of tree) {
    // Optional platform-specific packages — Next ships one @next/swc-* binary
    // per OS and CPU and installs only the matching one. The rest appear in the
    // tree but have nothing on disk and ship nothing, so there is no licence to
    // read and nothing to clear.
    if (!node.path || !existsSync(node.path)) {
      notInstalled.push(node);
      continue;
    }
    const { licence, repository } = await readLicence(node.path);
    installed.push({ ...node, licence, repository });
  }

  const nameWidth = Math.max(
    ...installed.map((entry) => `${entry.name}@${entry.version}`.length),
    ...notInstalled.map((entry) => `${entry.name}@${entry.version}`.length),
    7,
  );

  const disallowed = [];
  const excepted = [];

  console.log(
    `Production dependency licences (${installed.length} package(s) installed, direct and transitive):\n`,
  );
  for (const entry of installed) {
    const verdict = verdictFor(entry.name, entry.licence);

    const label = `${entry.name}@${entry.version}`.padEnd(nameWidth);
    const mark = { allowed: 'ok  ', excepted: 'note', disallowed: 'FAIL' }[
      verdict.outcome
    ];
    console.log(`  ${mark} ${label}  ${entry.licence || '(none determined)'}`);

    if (verdict.outcome === 'excepted') {
      excepted.push({ ...entry, reason: verdict.reason });
    } else if (verdict.outcome === 'disallowed') {
      disallowed.push(entry);
    }
  }

  if (notInstalled.length > 0) {
    console.log(
      `\nListed but not installed on this platform (${notInstalled.length} package(s)) — ` +
        'optional per-platform binaries, nothing of them ships:\n',
    );
    for (const entry of notInstalled) {
      console.log(
        `  --   ${`${entry.name}@${entry.version}`.padEnd(nameWidth)}`,
      );
    }
  }

  if (excepted.length > 0) {
    console.log(
      `\n${excepted.length} package(s) cleared by a recorded exception ` +
        '(docs/decisions/0003-dependency-licences.md):\n',
    );
    for (const entry of excepted) {
      console.log(`  ${entry.name}@${entry.version} — ${entry.licence}`);
      console.log(`      ${entry.reason}`);
    }
  }

  const allowList = [...ALLOWED].join(', ');

  if (disallowed.length > 0) {
    console.error(
      `\n${disallowed.length} production dependency/dependencies are not permissively licensed:\n`,
    );
    for (const entry of disallowed) {
      console.error(
        `  x ${entry.name}@${entry.version} — ${entry.licence || '(none determined)'}`,
      );
    }
    console.error(
      `\nAllowed licences: ${allowList}.\n` +
        'REQ-1 requires every runtime dependency to be permissively licensed. ' +
        'Replace the dependency, or move it to devDependencies if it never ships.\n' +
        'If it genuinely cannot be removed, record an exception with a reason in ' +
        'scripts/check-licences.mjs and docs/decisions/0003-dependency-licences.md.\n',
    );
    process.exit(1);
  }

  console.log(
    `\nAll ${installed.length} installed production dependency/dependencies are ` +
      `cleared (allowed: ${allowList}` +
      (excepted.length > 0
        ? `; ${excepted.length} by recorded exception).`
        : ').'),
  );
}

// Run the check when invoked as a script; stay inert when imported, so the
// allow-list and the expression evaluator can be unit-tested without walking
// the whole dependency tree.
const invokedDirectly =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  await main();
}
