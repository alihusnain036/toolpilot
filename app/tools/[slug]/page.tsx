import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  getPublishedTools,
  getToolBySlug,
  getToolComponentLoader,
  toolUrl,
} from '@/registry';

/**
 * The one canonical page for a tool, generated from the registry.
 *
 * `generateStaticParams` prerenders one page per *published* entry and
 * `dynamicParams = false` makes every other slug a 404, so an unpublished or
 * deleted tool has no page at all — there are no 'coming soon' pages (REQ-2).
 *
 * The layout here is deliberately bare: the designed tool page arrives with
 * the tool-page framework (TKT-8/TKT-9). What this ticket owns is the route
 * existing, the copy coming from the registry, and the tool's component being
 * dynamically imported rather than bundled into the shared chunk.
 */

export const dynamicParams = false;

interface ToolPageParams {
  readonly slug: string;
}

interface ToolPageProps {
  readonly params: ToolPageParams;
}

export function generateStaticParams(): ToolPageParams[] {
  return getPublishedTools().map((tool) => ({ slug: tool.slug }));
}

export function generateMetadata({ params }: ToolPageProps): Metadata {
  const tool = getToolBySlug(params.slug);
  if (tool === undefined) return {};

  return {
    title: tool.name,
    description: tool.shortDescription,
    alternates: { canonical: toolUrl(tool) },
  };
}

export default async function ToolPage({
  params,
}: ToolPageProps): Promise<React.JSX.Element> {
  const tool = getToolBySlug(params.slug);
  if (tool === undefined) notFound();

  // Validation guarantees a published tool has a loader, so the undefined
  // branch cannot be reached in a build that succeeded.
  const load = getToolComponentLoader(tool.slug);
  const ToolComponent = load === undefined ? undefined : (await load()).default;

  return (
    <article className="mx-auto max-w-content px-gutter py-section">
      <h1 className="text-3xl font-semibold tracking-tight">{tool.name}</h1>
      <p className="mt-stack max-w-prose text-muted-foreground">
        {tool.shortDescription}
      </p>
      {ToolComponent === undefined ? null : (
        <div className="mt-section">
          <ToolComponent />
        </div>
      )}
    </article>
  );
}
