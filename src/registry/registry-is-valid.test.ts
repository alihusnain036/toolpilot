import { describe, expect, it } from 'vitest';

import { CATEGORIES } from './categories';
import { TOOLS } from './tools';
import { committedRegistry, findRegistryProblems } from './validate';

/**
 * The build-time gate: `pnpm validate:registry` runs this file, and
 * `pnpm build` runs that first, so an invalid registry stops the build with a
 * message naming the entry at fault.
 *
 * It asserts about the *committed* registry only. The validation rules
 * themselves are tested in `validate.test.ts` against fixtures.
 */

/** REQ-2: fifteen tools ship in v1. */
const V1_TOOL_COUNT = 15;

describe('the committed tool registry', () => {
  it('passes every build-time validation', () => {
    const problems = findRegistryProblems(committedRegistry());

    expect(
      problems,
      `The tool registry is invalid:\n  - ${problems.join('\n  - ')}`,
    ).toEqual([]);
  });

  it('holds the 15 v1 tool entries', () => {
    expect(TOOLS).toHaveLength(V1_TOOL_COUNT);
  });

  it('uses every one of the five categories', () => {
    const used = [...new Set(TOOLS.map((tool) => tool.primaryCategory))].sort();
    const defined = CATEGORIES.map((category) => category.slug).sort();

    expect(used).toEqual(defined);
  });
});
