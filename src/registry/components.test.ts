import { describe, expect, it } from 'vitest';

import {
  getToolComponentLoader,
  TOOL_COMPONENTS,
  wiredComponentSlugs,
} from './components';
import { TOOLS } from './tools';

/**
 * The component map is the one wiring point between a registry entry and the
 * code that implements the tool. What matters here is that a lookup answers
 * only for slugs that are genuinely wired up — the build-time check that every
 * *published* entry has one lives in `validate.ts`.
 */
describe('getToolComponentLoader', () => {
  it('answers undefined for a tool whose component is not built yet', () => {
    for (const tool of TOOLS) {
      if (wiredComponentSlugs().includes(tool.slug)) continue;
      expect(getToolComponentLoader(tool.slug)).toBeUndefined();
    }
  });

  it('answers undefined for an unknown slug', () => {
    expect(getToolComponentLoader('no-such-tool')).toBeUndefined();
  });

  it.each([
    'constructor',
    'toString',
    '__proto__',
    'valueOf',
    'hasOwnProperty',
  ])('does not resolve the inherited property %o to a loader', (slug) => {
    expect(getToolComponentLoader(slug)).toBeUndefined();
  });

  it('returns the loader for a slug that is wired up', () => {
    for (const slug of wiredComponentSlugs()) {
      expect(typeof getToolComponentLoader(slug)).toBe('function');
    }
  });
});

describe('wiredComponentSlugs', () => {
  it('lists exactly the map’s own keys', () => {
    expect(wiredComponentSlugs()).toEqual(Object.keys(TOOL_COMPONENTS));
  });

  it('names only slugs that exist in the registry', () => {
    const known: readonly string[] = TOOLS.map((tool) => tool.slug);
    for (const slug of wiredComponentSlugs()) {
      expect(known).toContain(slug);
    }
  });
});
