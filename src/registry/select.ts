import {
  CATEGORIES,
  type Category,
  type CategoryDefinition,
} from './categories';
import type { ToolEntry } from './types';

/**
 * The selector logic, as pure functions over whatever registry they are given.
 *
 * `index.ts` binds these to the committed registry; the tests bind them to a
 * fixture. Keeping the logic here is what lets a fixture exercise cases the
 * real registry does not have yet — an unpublished entry, or a tool listed
 * under two categories.
 *
 * Every function is synchronous and reads nothing but its arguments: the
 * registry is compiled into the build, so there is nothing to await.
 */

/** Every category a tool is listed under, primary first. */
export function toolCategories(tool: ToolEntry): readonly Category[] {
  return [tool.primaryCategory, ...(tool.additionalCategories ?? [])];
}

/**
 * The published entries, in registry order.
 *
 * Unpublished entries are filtered out here and in every selector built on
 * this one, which is what keeps an unfinished tool off every surface.
 */
export function selectPublishedTools(
  registry: readonly ToolEntry[],
): readonly ToolEntry[] {
  return registry.filter((tool) => tool.published);
}

/** The published entry with this slug, or `undefined`. */
export function selectToolBySlug(
  registry: readonly ToolEntry[],
  slug: string,
): ToolEntry | undefined {
  return selectPublishedTools(registry).find((tool) => tool.slug === slug);
}

/**
 * The published entries listed under a category — by `primaryCategory` or by
 * `additionalCategories` — alphabetically by name.
 */
export function selectToolsByCategory(
  registry: readonly ToolEntry[],
  categorySlug: string,
): readonly ToolEntry[] {
  return selectPublishedTools(registry)
    .filter((tool) =>
      toolCategories(tool).some((category) => category === categorySlug),
    )
    .sort((first, second) => first.name.localeCompare(second.name, 'en'));
}

/** The five categories, in their fixed order. */
export function selectCategories(): readonly CategoryDefinition[] {
  return CATEGORIES;
}

/** The category with this slug, or `undefined` if it is not one of the five. */
export function selectCategoryBySlug(
  slug: string,
): CategoryDefinition | undefined {
  return CATEGORIES.find((category) => category.slug === slug);
}
