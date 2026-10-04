import { CATEGORY_SLUGS, isCategory } from './categories';
import { wiredComponentSlugs } from './components';
import { TOOLS } from './tools';
import { toolEntrySchema } from './types';

/**
 * Build-time validation of the tool registry.
 *
 * Run by `pnpm validate:registry`, which `pnpm build` runs first, so a
 * registry mistake stops the build with a message that names the entry rather
 * than surfacing later as a missing page or a broken link.
 *
 * It checks, in this order:
 *
 * 1. every entry parses against `toolEntrySchema` — slug shape, one-line
 *    description, keywords, icon name, and the file/text rules (a file tool
 *    accepts at least one type, a text tool none);
 * 2. slugs are unique;
 * 3. every category named is one of the five;
 * 4. every published entry has a component wired up.
 *
 * All problems are collected and reported together: a developer adding three
 * tools at once sees all three mistakes in one run.
 *
 * Entries arrive as `unknown` on purpose. The committed registry is
 * type-checked, but the tests feed it malformed entries, and an entry read
 * from a future JSON source would be unknown too.
 */

/** What validation looks at: the entries, and the slugs that have components. */
export interface RegistryToValidate {
  readonly tools: readonly unknown[];
  readonly componentSlugs: readonly string[];
}

export class RegistryValidationError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `The tool registry is invalid (${problems.length} problem${
        problems.length === 1 ? '' : 's'
      }):\n` +
        problems.map((problem) => `  - ${problem}`).join('\n') +
        '\n\nEvery tool on the site is generated from src/registry/tools.ts; ' +
        'see src/registry/README.md.',
    );
    this.name = 'RegistryValidationError';
    this.problems = problems;
  }
}

function readField(entry: unknown, key: string): unknown {
  if (typeof entry !== 'object' || entry === null) return undefined;
  return (entry as Record<string, unknown>)[key];
}

function readString(entry: unknown, key: string): string | undefined {
  const value = readField(entry, key);
  return typeof value === 'string' ? value : undefined;
}

/** How an entry is referred to in a message: its slug, or its position. */
function label(entry: unknown, index: number): string {
  const slug = readString(entry, 'slug');
  return slug === undefined ? `entry #${index + 1}` : `tool "${slug}"`;
}

/** Every category an entry names, however malformed, for the category check. */
function namedCategories(entry: unknown): readonly unknown[] {
  const additional = readField(entry, 'additionalCategories');
  return [
    readField(entry, 'primaryCategory'),
    ...(Array.isArray(additional) ? (additional as readonly unknown[]) : []),
  ];
}

function describeCategory(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : String(value);
}

/** Every problem with the registry, as messages fit to print. */
export function findRegistryProblems(
  registry: RegistryToValidate,
): readonly string[] {
  const problems: string[] = [];
  const { tools, componentSlugs } = registry;

  // 1. Schema.
  tools.forEach((entry, index) => {
    const result = toolEntrySchema.safeParse(entry);
    if (result.success) return;

    for (const issue of result.error.issues) {
      const field = issue.path.join('.');
      const where = field === '' ? '' : `${field}: `;
      problems.push(`${label(entry, index)}: ${where}${issue.message}`);
    }
  });

  // 2. Unique slugs.
  const firstSeenAt = new Map<string, number>();
  tools.forEach((entry, index) => {
    const slug = readString(entry, 'slug');
    if (slug === undefined) return;

    const previous = firstSeenAt.get(slug);
    if (previous === undefined) {
      firstSeenAt.set(slug, index);
      return;
    }

    problems.push(
      `duplicate slug "${slug}": entries #${previous + 1} and #${index + 1} ` +
        'both use it. Slugs are unique and are never reused for a different tool.',
    );
  });

  // 3. Known categories.
  tools.forEach((entry, index) => {
    for (const category of namedCategories(entry)) {
      if (category === undefined || isCategory(category)) continue;

      const named = describeCategory(category);
      problems.push(
        `${label(entry, index)}: invalid category ${named} — ` +
          `the five v1 categories are ${CATEGORY_SLUGS.join(', ')}.`,
      );
    }
  });

  // 4. Published entries have a component.
  const wired = new Set(componentSlugs);
  tools.forEach((entry, index) => {
    if (readField(entry, 'published') !== true) return;

    const slug = readString(entry, 'slug');
    if (slug !== undefined && wired.has(slug)) return;

    problems.push(
      `${label(entry, index)} is published but has no component in ` +
        'src/registry/components.ts. Add its loader there, or set ' +
        '`published: false` until its component exists.',
    );
  });

  return problems;
}

/** The committed registry, as validation sees it. */
export function committedRegistry(): RegistryToValidate {
  return { tools: TOOLS, componentSlugs: wiredComponentSlugs() };
}

/**
 * Throws `RegistryValidationError` listing every problem, or returns quietly.
 * Defaults to the committed registry.
 */
export function validateRegistry(
  registry: RegistryToValidate = committedRegistry(),
): void {
  const problems = findRegistryProblems(registry);
  if (problems.length > 0) {
    throw new RegistryValidationError(problems);
  }
}
