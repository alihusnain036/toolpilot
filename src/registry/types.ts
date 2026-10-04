import { z } from 'zod';

import { CATEGORY_SLUGS, type Category } from './categories';

/**
 * The shape of one tool registry entry, and the zod schema that mirrors it.
 *
 * The interface is what authors write against and what every surface reads.
 * The schema is what `pnpm validate:registry` checks at build time: it catches
 * the things a type cannot, such as a slug that is typed correctly as a string
 * but is not lowercase-hyphenated, or a file tool that accepts nothing.
 *
 * Nothing that renders at runtime imports the schema — pages import
 * `ToolEntry` as a *type* only, so zod stays out of the client bundle.
 */

/** Slugs are lowercase alphanumerics joined by single hyphens. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** lucide-react exports its icons in PascalCase, e.g. `ImageMinus`. */
export const ICON_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

/** One line of description; long enough to be useful, short enough for a card. */
export const MAX_SHORT_DESCRIPTION_LENGTH = 140;

/** What a tool takes in: a file from disk, or text typed or pasted in. */
export type InputKind = 'file' | 'text';

export interface ToolEntry {
  /** Stable, lowercase-hyphenated identifier. Also the URL segment. */
  readonly slug: string;
  /** Display name, as it appears in headings, cards and search results. */
  readonly name: string;
  /** One line, used on cards, in search results and as the meta description. */
  readonly shortDescription: string;
  /** The category the tool belongs to first; drives its home-page grouping. */
  readonly primaryCategory: Category;
  /** Further categories the tool is listed under. The URL does not change. */
  readonly additionalCategories?: readonly Category[];
  /** Search terms and aliases — what a visitor might type instead of the name. */
  readonly keywords: readonly string[];
  /** Whether the tool takes a file or text. */
  readonly inputKind: InputKind;
  /** MIME types and extensions accepted. Empty for a text tool. */
  readonly acceptedFileTypes: readonly string[];
  /** Size cap in bytes, enforced before processing starts. */
  readonly maxInputBytes: number;
  /** Name of the lucide-react icon to render for the tool. */
  readonly icon: string;
  /**
   * Whether the tool is live. An unpublished entry is not routed, not listed,
   * not indexed and not in the sitemap — there are no 'coming soon' pages.
   */
  readonly published: boolean;
}

/** One of the five fixed categories. */
export const categorySlugSchema = z.enum(CATEGORY_SLUGS);

export const toolEntrySchema = z
  .object({
    slug: z
      .string()
      .regex(
        SLUG_PATTERN,
        'slug must be lowercase letters and digits joined by single hyphens, e.g. "image-compressor"',
      ),
    name: z.string().min(1, 'name must not be empty'),
    shortDescription: z
      .string()
      .min(1, 'shortDescription must not be empty')
      .max(
        MAX_SHORT_DESCRIPTION_LENGTH,
        `shortDescription must be at most ${MAX_SHORT_DESCRIPTION_LENGTH} characters`,
      )
      .refine((value) => !/[\r\n]/.test(value), {
        message: 'shortDescription must be a single line',
      }),
    primaryCategory: categorySlugSchema,
    additionalCategories: z.array(categorySlugSchema).optional(),
    keywords: z
      .array(z.string().min(1, 'a keyword must not be empty'))
      .min(1, 'keywords must list at least one term'),
    inputKind: z.enum(['file', 'text']),
    acceptedFileTypes: z.array(
      z.string().min(1, 'an accepted file type must not be empty'),
    ),
    maxInputBytes: z
      .number()
      .int('maxInputBytes must be a whole number of bytes')
      .positive('maxInputBytes must be greater than zero'),
    icon: z
      .string()
      .regex(
        ICON_NAME_PATTERN,
        'icon must be a lucide-react icon name in PascalCase, e.g. "ImageMinus"',
      ),
    published: z.boolean(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.inputKind === 'file' && entry.acceptedFileTypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['acceptedFileTypes'],
        message: 'a file tool must accept at least one file type',
      });
    }

    if (entry.inputKind === 'text' && entry.acceptedFileTypes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['acceptedFileTypes'],
        message: 'a text tool must not list accepted file types',
      });
    }

    const additional = entry.additionalCategories ?? [];

    if (additional.includes(entry.primaryCategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['additionalCategories'],
        message: `additionalCategories must not repeat primaryCategory ("${entry.primaryCategory}")`,
      });
    }

    if (new Set(additional).size !== additional.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['additionalCategories'],
        message: 'additionalCategories must not list the same category twice',
      });
    }
  });

/** What the schema produces once an entry has parsed. */
export type ParsedToolEntry = z.infer<typeof toolEntrySchema>;

type Assert<T extends true> = T;

/**
 * Compile-time proof that the schema and the interface have not drifted apart:
 * if a field is added to one and not the other, this stops compiling.
 */
export type SchemaMirrorsToolEntry = Assert<
  ParsedToolEntry extends ToolEntry ? true : false
>;
