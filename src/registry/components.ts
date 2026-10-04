import type { ComponentType } from 'react';

/**
 * The one place a tool's component is wired to its registry entry.
 *
 * Every value is a dynamic `import()`, so a tool's code — and the libraries it
 * pulls in — is fetched only when that tool's page is opened
 * (docs/decisions/0004-dynamic-imports.md). Nothing is imported at the top
 * level of this module.
 *
 * A *published* entry with no key here fails `pnpm validate:registry`, and so
 * the build, naming the slug. An *unpublished* entry needs no key: that is the
 * state every v1 tool starts in, and each tool's ticket adds its line here and
 * flips `published` in the same change.
 *
 * Keys are plain strings rather than the `ToolSlug` union on purpose: deleting
 * a tool's registry entry must not force an edit here (REQ-2 criterion 2), so
 * a loader left behind for a tool that no longer exists is harmless and is
 * simply never reached. The slug ↔ loader correspondence is checked at build
 * time instead, by `validate.ts`.
 */
export type ToolComponentLoader = () => Promise<{
  readonly default: ComponentType;
}>;

export const TOOL_COMPONENTS: Readonly<
  Record<string, ToolComponentLoader | undefined>
> = {
  // Each tool's own ticket adds its line, e.g.:
  // 'json-formatter': () => import('@/tools/json-formatter'),
};

/**
 * The loader for a slug, or `undefined` when none is wired up. Callers hold a
 * slug read from a route parameter, so an unknown slug answers `undefined`
 * rather than throwing.
 *
 * The lookup is `Object.hasOwn`-guarded rather than a bare index read: a plain
 * object answers `'constructor'` and `'toString'` from its prototype, and a
 * slug arriving from a route parameter must never resolve to something that is
 * not a wired loader.
 */
export function getToolComponentLoader(
  slug: string,
): ToolComponentLoader | undefined {
  if (!Object.hasOwn(TOOL_COMPONENTS, slug)) return undefined;
  return TOOL_COMPONENTS[slug];
}

/** Slugs that have a component wired up. Used by the build-time validation. */
export function wiredComponentSlugs(): readonly string[] {
  return Object.keys(TOOL_COMPONENTS);
}
