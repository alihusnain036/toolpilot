import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  categoryUrl,
  getCategories,
  getCategoryBySlug,
  getToolsByCategory,
  toolUrl,
} from '@/registry';

/**
 * A category page, generated from the registry: one per category, listing
 * exactly that category's published tools.
 *
 * Every link goes through `toolUrl()`, so a tool listed under two categories
 * is linked at the same single URL from both (REQ-2). The designed catalogue
 * layout lands in TKT-4; this is the route and the data.
 */

export const dynamicParams = false;

interface CategoryPageParams {
  readonly slug: string;
}

interface CategoryPageProps {
  readonly params: CategoryPageParams;
}

export function generateStaticParams(): CategoryPageParams[] {
  return getCategories().map((category) => ({ slug: category.slug }));
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const category = getCategoryBySlug(params.slug);
  if (category === undefined) return {};

  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: categoryUrl(category) },
  };
}

export default function CategoryPage({
  params,
}: CategoryPageProps): React.JSX.Element {
  const category = getCategoryBySlug(params.slug);
  if (category === undefined) notFound();

  const tools = getToolsByCategory(category.slug);

  return (
    <div className="mx-auto max-w-content px-gutter py-section">
      <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
      <p className="mt-stack max-w-prose text-muted-foreground">
        {category.description}
      </p>

      {tools.length === 0 ? (
        <p className="mt-section text-muted-foreground">
          No tools in this category yet.
        </p>
      ) : (
        <ul className="mt-section space-y-stack">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <Link href={toolUrl(tool)} className="font-medium underline">
                {tool.name}
              </Link>
              <p className="max-w-prose text-sm text-muted-foreground">
                {tool.shortDescription}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
