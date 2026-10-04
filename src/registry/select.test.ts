import { describe, expect, it } from 'vitest';

import { fixtureRegistry } from './fixtures';
import {
  categoryUrl,
  getCategories,
  getCategoryBySlug,
  getPublishedTools,
  getToolBySlug,
  getToolsByCategory,
  toolUrl,
} from './index';
import {
  selectPublishedTools,
  selectToolBySlug,
  selectToolsByCategory,
  toolCategories,
} from './select';
import { TOOLS } from './tools';
import type { ToolEntry } from './types';

function slugs(tools: readonly ToolEntry[]): readonly string[] {
  return tools.map((tool) => tool.slug);
}

/** The fixture's published slugs for a category, in the order returned. */
function inCategory(categorySlug: string): readonly string[] {
  return slugs(selectToolsByCategory(fixtureRegistry, categorySlug));
}

describe('selectPublishedTools', () => {
  it('returns the published entries in registry order', () => {
    expect(slugs(selectPublishedTools(fixtureRegistry))).toEqual([
      'zulu-tool',
      'alpha-tool',
      'two-category-tool',
      'image-fixture-tool',
    ]);
  });

  it('leaves out an unpublished entry', () => {
    expect(slugs(selectPublishedTools(fixtureRegistry))).not.toContain(
      'unpublished-tool',
    );
  });
});

describe('selectToolBySlug', () => {
  it('finds a published tool', () => {
    expect(selectToolBySlug(fixtureRegistry, 'alpha-tool')?.name).toBe(
      'Alpha Tool',
    );
  });

  it('does not find an unpublished tool', () => {
    const found = selectToolBySlug(fixtureRegistry, 'unpublished-tool');
    expect(found).toBeUndefined();
  });

  it('does not find an unknown slug', () => {
    expect(selectToolBySlug(fixtureRegistry, 'no-such-tool')).toBeUndefined();
  });
});

describe('selectToolsByCategory', () => {
  it('returns the category’s published tools alphabetically by name', () => {
    expect(inCategory('developer-tools')).toEqual([
      'alpha-tool',
      'two-category-tool',
      'zulu-tool',
    ]);
  });

  it('matches additionalCategories as well as primaryCategory', () => {
    expect(inCategory('generators')).toEqual(['two-category-tool']);
  });

  it('returns nothing unpublished', () => {
    const all = selectToolsByCategory(fixtureRegistry, 'developer-tools');
    expect(all.every((tool) => tool.published)).toBe(true);
  });

  it('returns an empty list for a category with no published tools', () => {
    expect(selectToolsByCategory(fixtureRegistry, 'pdf-tools')).toEqual([]);
  });

  it('returns an empty list for an unknown category', () => {
    expect(selectToolsByCategory(fixtureRegistry, 'crypto-tools')).toEqual([]);
  });
});

describe('a tool listed under two categories', () => {
  const inBoth = (categorySlug: string): readonly string[] =>
    selectToolsByCategory(fixtureRegistry, categorySlug)
      .filter((tool) => tool.slug === 'two-category-tool')
      .map((tool) => toolUrl(tool));

  it('is returned by both of its categories', () => {
    expect(inBoth('developer-tools')).toHaveLength(1);
    expect(inBoth('generators')).toHaveLength(1);
  });

  it('has one canonical URL, whichever category it was reached from', () => {
    expect(inBoth('developer-tools')).toEqual(['/tools/two-category-tool']);
    expect(inBoth('generators')).toEqual(inBoth('developer-tools'));
  });

  it('lists its primary category first', () => {
    const tool = selectToolBySlug(fixtureRegistry, 'two-category-tool');
    expect(tool && toolCategories(tool)).toEqual([
      'developer-tools',
      'generators',
    ]);
  });
});

describe('toolUrl', () => {
  it('is the one canonical tool path', () => {
    expect(toolUrl({ slug: 'json-formatter' })).toBe('/tools/json-formatter');
  });
});

describe('categoryUrl', () => {
  it('accepts a slug or a category', () => {
    expect(categoryUrl('image-tools')).toBe('/category/image-tools');
    expect(categoryUrl({ slug: 'pdf-tools' })).toBe('/category/pdf-tools');
  });
});

describe('getCategories', () => {
  it('returns the five fixed categories in order', () => {
    expect(getCategories().map((category) => category.slug)).toEqual([
      'developer-tools',
      'image-tools',
      'pdf-tools',
      'text-tools',
      'generators',
    ]);
  });

  it('resolves a category by slug and rejects an unknown one', () => {
    expect(getCategoryBySlug('text-tools')?.name).toBe('Text Tools');
    expect(getCategoryBySlug('crypto-tools')).toBeUndefined();
  });
});

describe('the selectors bound to the committed registry', () => {
  it('reads the committed registry and nothing else', () => {
    expect(getPublishedTools()).toEqual(selectPublishedTools(TOOLS));
  });

  it('agrees with the pure selectors for a category', () => {
    expect(getToolsByCategory('image-tools')).toEqual(
      selectToolsByCategory(TOOLS, 'image-tools'),
    );
  });

  it('returns undefined for a slug that is not in the registry', () => {
    expect(getToolBySlug('no-such-tool')).toBeUndefined();
  });
});
