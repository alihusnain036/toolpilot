import { describe, expect, it } from 'vitest';

import {
  fixtureComponentSlugs,
  fixtureRegistry,
  makeToolEntry,
} from './fixtures';
import {
  findRegistryProblems,
  RegistryValidationError,
  validateRegistry,
} from './validate';

/** Every problem joined up, so an assertion can match one message. */
function problemsFor(
  tools: readonly unknown[],
  componentSlugs: readonly string[] = fixtureComponentSlugs,
): string {
  return findRegistryProblems({ tools, componentSlugs }).join('\n');
}

describe('findRegistryProblems', () => {
  it('finds nothing wrong with a valid registry', () => {
    expect(
      findRegistryProblems({
        tools: fixtureRegistry,
        componentSlugs: fixtureComponentSlugs,
      }),
    ).toEqual([]);
  });

  it('names the duplicated slug when two entries share one', () => {
    const problems = problemsFor(
      [
        makeToolEntry({ slug: 'json-formatter', name: 'First' }),
        makeToolEntry({ slug: 'json-formatter', name: 'Second' }),
      ],
      ['json-formatter'],
    );

    expect(problems).toMatch(/duplicate slug "json-formatter"/);
    expect(problems).toMatch(/entries #1 and #2/);
  });

  it('accepts two entries whose slugs merely resemble each other', () => {
    expect(
      problemsFor(
        [
          makeToolEntry({ slug: 'split-pdf' }),
          makeToolEntry({ slug: 'split-pdfs' }),
        ],
        ['split-pdf', 'split-pdfs'],
      ),
    ).toBe('');
  });

  it('names an invalid primaryCategory', () => {
    const entry = {
      ...makeToolEntry({ slug: 'crypto-thing' }),
      primaryCategory: 'crypto-tools',
    };

    const problems = problemsFor([entry], ['crypto-thing']);

    expect(problems).toMatch(/tool "crypto-thing"/);
    expect(problems).toMatch(/invalid category "crypto-tools"/);
    expect(problems).toMatch(/developer-tools, image-tools, pdf-tools/);
  });

  it('names an invalid additionalCategories entry', () => {
    const entry = {
      ...makeToolEntry({ slug: 'crypto-thing' }),
      additionalCategories: ['productivity-tools'],
    };

    expect(problemsFor([entry], ['crypto-thing'])).toMatch(
      /invalid category "productivity-tools"/,
    );
  });

  it('names a published entry that has no component', () => {
    const problems = problemsFor(
      [makeToolEntry({ slug: 'alpha-tool', published: true })],
      [],
    );

    expect(problems).toMatch(/tool "alpha-tool" is published but has no/);
    expect(problems).toMatch(/src\/registry\/components\.ts/);
  });

  it('allows an unpublished entry with no component', () => {
    expect(
      problemsFor([makeToolEntry({ slug: 'alpha-tool', published: false })], []),
    ).toBe('');
  });

  it('allows a component for a slug that is not published yet', () => {
    const entry = makeToolEntry({ slug: 'alpha-tool', published: false });
    expect(problemsFor([entry], ['alpha-tool'])).toBe('');
  });

  it('reports a schema problem against the entry it belongs to', () => {
    expect(
      problemsFor([makeToolEntry({ slug: 'Bad Slug' })], ['Bad Slug']),
    ).toMatch(/tool "Bad Slug": slug: slug must be lowercase/);
  });

  it('refers to an entry by position when its slug is unusable', () => {
    expect(problemsFor([{ name: 'No slug at all' }], [])).toMatch(/entry #1/);
  });

  it('collects every problem rather than stopping at the first', () => {
    const problems = findRegistryProblems({
      tools: [
        makeToolEntry({ slug: 'alpha-tool', published: true }),
        makeToolEntry({ slug: 'alpha-tool', published: true }),
      ],
      componentSlugs: [],
    });

    expect(problems.length).toBeGreaterThan(1);
  });
});

describe('validateRegistry', () => {
  it('returns quietly for a valid registry', () => {
    expect(() =>
      validateRegistry({
        tools: fixtureRegistry,
        componentSlugs: fixtureComponentSlugs,
      }),
    ).not.toThrow();
  });

  it('throws a RegistryValidationError listing the problems', () => {
    const invalid = {
      tools: [makeToolEntry({ slug: 'alpha-tool', published: true })],
      componentSlugs: [],
    };

    expect(() => validateRegistry(invalid)).toThrowError(
      RegistryValidationError,
    );
    expect(() => validateRegistry(invalid)).toThrowError(
      /is published but has no component/,
    );
  });

  it('counts the problems in the message', () => {
    try {
      validateRegistry({
        tools: [makeToolEntry({ slug: 'alpha-tool', published: true })],
        componentSlugs: [],
      });
      expect.unreachable('validateRegistry should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RegistryValidationError);
      expect((error as RegistryValidationError).problems).toHaveLength(1);
    }
  });
});
