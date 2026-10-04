import type { Category, CategoryDefinition } from './categories';
import {
  selectCategories,
  selectCategoryBySlug,
  selectPublishedTools,
  selectToolBySlug,
  selectToolsByCategory,
} from './select';
import { TOOLS } from './tools';
import type { ToolEntry } from './types';

/**
 * The registry's public surface. Every catalogue, navigation, search and SEO
 * surface reads tools through these selectors and links to them with
 * `toolUrl()` — nothing imports `tools.ts` directly, and nothing builds a
 * tool path by hand.
 *
 * All of it is synchronous and pure: the registry is compiled into the static
 * build, so there is nothing to fetch and nothing to cache.
 */

export type { Category, CategoryDefinition, ToolEntry };
export type { InputKind } from './types';
export type { ToolSlug } from './tools';
export type { ToolComponentLoader } from './components';
export { getToolComponentLoader } from './components';
export { toolCategories } from './select';
export {
  IMAGE_FILE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_TEXT_BYTES,
  PDF_FILE_TYPES,
} from './limits';

/** Every published tool, in registry order. */
export function getPublishedTools(): readonly ToolEntry[] {
  return selectPublishedTools(TOOLS);
}

/**
 * The published tool with this slug, or `undefined`.
 *
 * An unpublished or unknown slug returns `undefined`, which is what makes a
 * tool page 404 rather than render an empty shell.
 */
export function getToolBySlug(slug: string): ToolEntry | undefined {
  return selectToolBySlug(TOOLS, slug);
}

/**
 * The published tools in a category, alphabetically by name. A tool listed
 * under two categories is returned by both.
 */
export function getToolsByCategory(categorySlug: string): readonly ToolEntry[] {
  return selectToolsByCategory(TOOLS, categorySlug);
}

/** The five fixed categories, in their fixed order. */
export function getCategories(): readonly CategoryDefinition[] {
  return selectCategories();
}

/** The category with this slug, or `undefined` if it is not one of the five. */
export function getCategoryBySlug(
  slug: string,
): CategoryDefinition | undefined {
  return selectCategoryBySlug(slug);
}

/**
 * The one canonical path for a tool.
 *
 * A tool has exactly one page however many categories list it (REQ-2), so
 * this is the only way any surface links to a tool.
 */
export function toolUrl(tool: Pick<ToolEntry, 'slug'>): string {
  return `/tools/${tool.slug}`;
}

/** The one canonical path for a category. */
export function categoryUrl(
  category: Category | Pick<CategoryDefinition, 'slug'>,
): string {
  const slug = typeof category === 'string' ? category : category.slug;
  return `/category/${slug}`;
}
