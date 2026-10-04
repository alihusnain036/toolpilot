import { describe, expect, it } from 'vitest';

// A namespace import, destructured below, so that the directive stays on the
// same line as the specifier it suppresses — Prettier would otherwise wrap a
// named import across lines and leave the directive pointing at nothing.
// @ts-expect-error -- a plain .mjs script with no type declarations of its own.
import * as licenceCheck from './check-licences.mjs';

const { ALLOWED, EXCEPTIONS, evaluateExpression, verdictFor } = licenceCheck;

/**
 * Unit tests for the licence check's decision logic.
 *
 * `pnpm licences` itself runs against the real installed tree, and CI runs it as
 * its own step — that is what proves the check exits 0 today. What is tested
 * here is the part no real tree can exercise safely: that a copyleft licence is
 * rejected. Installing a GPL dependency to prove it would mean shipping one.
 */

describe('allow-list', () => {
  it('contains only the six permissive licences REQ-1 names', () => {
    expect([...ALLOWED].sort()).toEqual([
      '0BSD',
      'Apache-2.0',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'ISC',
      'MIT',
    ]);
  });
});

describe('evaluateExpression', () => {
  it.each(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD'])(
    'accepts %s',
    (licence) => {
      expect(evaluateExpression(licence).ok).toBe(true);
    },
  );

  it.each([
    'GPL-3.0',
    'GPL-3.0-only',
    'GPL-2.0-or-later',
    'AGPL-3.0',
    'LGPL-3.0',
    'SSPL-1.0',
    'CC-BY-NC-4.0',
    'UNLICENSED',
  ])('rejects %s', (licence) => {
    expect(evaluateExpression(licence).ok).toBe(false);
  });

  it('accepts a dual licence when either branch is permissive', () => {
    expect(evaluateExpression('(MIT OR GPL-2.0)').ok).toBe(true);
    expect(evaluateExpression('(GPL-2.0 OR Apache-2.0)').ok).toBe(true);
  });

  it('rejects a dual licence when no branch is permissive', () => {
    expect(evaluateExpression('(GPL-2.0 OR AGPL-3.0)').ok).toBe(false);
  });

  it('accepts a combined licence only when every part is permissive', () => {
    expect(evaluateExpression('MIT AND ISC').ok).toBe(true);
    expect(evaluateExpression('MIT AND GPL-3.0').ok).toBe(false);
  });

  it('treats a missing licence as a failure, not a pass', () => {
    expect(evaluateExpression('').ok).toBe(false);
    expect(evaluateExpression(undefined).ok).toBe(false);
    expect(evaluateExpression(null).ok).toBe(false);
    expect(evaluateExpression('').reason).toBe('no licence declared');
  });

  it('accepts a guessed permissive licence and still rejects a guessed copyleft one', () => {
    // license-checker marks a licence it inferred from a LICENSE file with '*'.
    expect(evaluateExpression('MIT*').ok).toBe(true);
    expect(evaluateExpression('GPL-3.0*').ok).toBe(false);
  });

  it('reports the parts it decided on, for the printed table', () => {
    expect(evaluateExpression('(MIT OR Apache-2.0)').parts).toEqual([
      'MIT',
      'Apache-2.0',
    ]);
  });
});

describe('verdictFor', () => {
  it('allows a package whose licence is on the allow-list', () => {
    expect(verdictFor('react', 'MIT').outcome).toBe('allowed');
  });

  it('disallows a package whose licence is not, with no exception', () => {
    expect(verdictFor('some-gpl-package', 'GPL-3.0').outcome).toBe(
      'disallowed',
    );
  });

  it('clears a package named by a recorded exception at that exact licence', () => {
    const verdict = verdictFor('caniuse-lite', 'CC-BY-4.0');
    expect(verdict.outcome).toBe('excepted');
    expect(verdict.reason).toContain('build time');
  });

  it('stops honouring an exception if the licence changes', () => {
    // A version bump that relicenses the package must fail the check again
    // rather than inherit the exemption.
    expect(verdictFor('caniuse-lite', 'GPL-3.0').outcome).toBe('disallowed');
  });

  it('does not let an exception cover a different package', () => {
    expect(verdictFor('something-else', 'CC-BY-4.0').outcome).toBe(
      'disallowed',
    );
  });

  it('gives every exception a written reason a reviewer can check', () => {
    for (const [name, exception] of EXCEPTIONS) {
      expect(name, 'exception key must be a package name').toBeTruthy();
      expect(exception.licence).toMatch(/\S/);
      expect(exception.reason.length).toBeGreaterThan(80);
    }
  });
});
