import type { ComponentType } from 'react';

import type { ToolSlug } from './tools';

/**
 * The one place a tool's component is wired to its registry entry.
 *
 * Every loader is a dynamic `import()`, so a tool's code — and the libraries
 * it pulls in — is fetched only when that tool's page is opened
 * (docs/decisions/0004-dynamic-imports.md). Nothing here is imported at the
 * top level.
 *
 * A published entry with no key in this map fails `pnpm validate:registry`,
 * and therefore the build, naming the slug. An *unpublished* entry needs no
 * key: that is the state every v1 tool starts in, and each tool's ticket adds
 * its line here and flips `published` in the same change.
 *
 * The key type is `ToolSlug`, so a typo in a slug is a compile error too.
 */
export type ToolComponentLoader = () => Promise<{
  readonly default: ComponentType;
}>;

export const TOOL_COMPONENTS: Readonly<
  Partial<Record<ToolSlug, ToolComponentLoader>>
> = {
  // Each tool's own ticket adds its line, e.g.:
  // 'json-formatter': () => import('@/tools/json-formatter'),
};

/**
 * The loader for a slug, or `undefined` when none is wired up.
 *
 * Takes a plain `string` because callers hold a slug read from a route
 * parameter; `TOOL_COMPONENTS` is indexed as a partial record, so an unknown
 * slug returns `undefined` rather than throwing.
 */
export function getToolComponentLoader(
  slug: string,
): ToolComponentLoader | undefined {
  const loaders = TOOL_COMPONENTS as Readonly<
    Record<string, ToolComponentLoader | undefined>
  >;
  return loaders[slug];
}

/** Slugs that have a component wired up. Used by the build-time validation. */
export function wiredComponentSlugs(): readonly string[] {
  return Object.keys(TOOL_COMPONENTS);
}
