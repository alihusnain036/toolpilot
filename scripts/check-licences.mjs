#!/usr/bin/env node
/**
 * ToolPilot's dependency licence check.
 *
 * REQ-1: every runtime dependency must be permissively licensed. This script
 * lists each production dependency with its licence and exits non-zero if any
 * licence falls outside the allow-list — so a copyleft dependency cannot be
 * merged by accident.
 *
 * Run with `pnpm licences`. CI runs it on every pull request and on main.
 */

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { init } = require('license-checker-rseidelsohn');

/**
 * SPDX identifiers permitted for production dependencies. Each is permissive:
 * no copyleft obligation attaches to shipping ToolPilot's static bundle.
 */
const ALLOWED = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
]);

/**
 * Splits a compound SPDX expression ("(MIT OR Apache-2.0)", "MIT AND ISC")
 * into its parts along with how they combine.
 *
 * - An OR expression is satisfied if ANY branch is allowed (we may choose it).
 * - An AND expression is satisfied only if EVERY branch is allowed.
 */
function evaluateExpression(raw) {
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

function splitName(key) {
  const at = key.lastIndexOf('@');
  if (at <= 0) return { name: key, version: '' };
  return { name: key.slice(0, at), version: key.slice(at + 1) };
}

init(
  {
    start: process.cwd(),
    production: true,
    excludePrivatePackages: true,
    direct: Infinity,
  },
  (error, packages) => {
    if (error) {
      console.error('licence check failed to read the dependency tree:');
      console.error(error);
      process.exit(1);
      return;
    }

    const entries = Object.entries(packages ?? {})
      .map(([key, info]) => {
        const { name, version } = splitName(key);
        const licence = Array.isArray(info.licenses)
          ? info.licenses.join(' AND ')
          : (info.licenses ?? '');
        return { name, version, licence, repository: info.repository ?? '' };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    if (entries.length === 0) {
      console.error(
        'licence check found no production dependencies — that is almost ' +
          'certainly a broken dependency tree, not an empty one. Run `pnpm install`.',
      );
      process.exit(1);
      return;
    }

    const nameWidth = Math.max(
      ...entries.map((entry) => `${entry.name}@${entry.version}`.length),
      7,
    );

    const disallowed = [];

    console.log(
      `Production dependency licences (${entries.length} package(s)):\n`,
    );
    for (const entry of entries) {
      const verdict = evaluateExpression(entry.licence);
      const label = `${entry.name}@${entry.version}`.padEnd(nameWidth);
      const mark = verdict.ok ? 'ok  ' : 'FAIL';
      console.log(`  ${mark} ${label}  ${entry.licence || '(none declared)'}`);
      if (!verdict.ok) disallowed.push(entry);
    }

    const allowList = [...ALLOWED].join(', ');

    if (disallowed.length > 0) {
      console.error(
        `\n${disallowed.length} production dependency/dependencies are not permissively licensed:\n`,
      );
      for (const entry of disallowed) {
        console.error(
          `  ✖ ${entry.name}@${entry.version} — ${entry.licence || '(none declared)'}`,
        );
      }
      console.error(
        `\nAllowed licences: ${allowList}.\n` +
          'REQ-1 requires every runtime dependency to be permissively licensed. ' +
          'Replace the dependency, or move it to devDependencies if it never ships.\n',
      );
      process.exit(1);
      return;
    }

    console.log(
      `\nAll ${entries.length} production dependency/dependencies are permissively ` +
        `licensed (allowed: ${allowList}).`,
    );
  },
);
