/**
 * The five categories ToolPilot ships in v1.
 *
 * REQ-2 fixes them: Developer Tools, Image Tools, PDF Tools, Text Tools and
 * Generators. They are a `const` tuple rather than a list of strings so the
 * `Category` type below is derived from the data — naming a sixth category
 * anywhere in the repository is a *type* error as well as a build error.
 *
 * Adding a category in a later version means adding an entry here; nothing
 * else in the registry enumerates them.
 */

/** The shape every category entry has. Used only to constrain the tuple. */
interface CategoryShape {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
}

export const CATEGORIES = [
  {
    slug: 'developer-tools',
    name: 'Developer Tools',
    description:
      'Format, decode and test the things developers work with every day.',
  },
  {
    slug: 'image-tools',
    name: 'Image Tools',
    description:
      'Compress, resize, convert and clean up images without uploading them.',
  },
  {
    slug: 'pdf-tools',
    name: 'PDF Tools',
    description: 'Merge, split and build PDF documents right in your browser.',
  },
  {
    slug: 'text-tools',
    name: 'Text Tools',
    description: 'Count, convert and tidy up text as you type.',
  },
  {
    slug: 'generators',
    name: 'Generators',
    description:
      'Produce QR codes, passwords and other one-off values on the spot.',
  },
] as const satisfies readonly CategoryShape[];

/**
 * Every valid category slug, derived from the tuple. An unknown category is a
 * compile error at the point it is written.
 */
export type Category = (typeof CATEGORIES)[number]['slug'];

/** One category, as the catalogue and navigation surfaces consume it. */
export interface CategoryDefinition {
  readonly slug: Category;
  readonly name: string;
  readonly description: string;
}

/**
 * The slugs on their own, still as a tuple, so zod can build an enum from them
 * without the five values being written down a second time.
 */
type CategorySlugTuple = {
  -readonly [Index in keyof typeof CATEGORIES]: (typeof CATEGORIES)[Index]['slug'];
};

export const CATEGORY_SLUGS: CategorySlugTuple = CATEGORIES.map(
  (category) => category.slug,
) as CategorySlugTuple;

/** Narrows an arbitrary string to one of the five categories. */
export function isCategory(value: unknown): value is Category {
  return (
    typeof value === 'string' &&
    (CATEGORY_SLUGS as readonly string[]).includes(value)
  );
}
