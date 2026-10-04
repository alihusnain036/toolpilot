import { describe, expect, it } from 'vitest';

import { getPublishedTools, toolUrl } from '@/registry';

import { dynamicParams, generateMetadata, generateStaticParams } from './page';

/**
 * The route's build-time contract: one prerendered page per published tool,
 * no page for anything else.
 */
describe('tool route', () => {
  it('generates one static param per published tool, and no others', () => {
    expect(generateStaticParams()).toEqual(
      getPublishedTools().map((tool) => ({ slug: tool.slug })),
    );
  });

  it('refuses to render a slug it did not generate', () => {
    // dynamicParams = false is what turns an unpublished or unknown slug into
    // a 404 instead of an on-demand render.
    expect(dynamicParams).toBe(false);
  });

  it('takes its metadata from the registry entry', () => {
    for (const tool of getPublishedTools()) {
      const metadata = generateMetadata({ params: { slug: tool.slug } });
      expect(metadata.title).toBe(tool.name);
      expect(metadata.description).toBe(tool.shortDescription);
      expect(metadata.alternates?.canonical).toBe(toolUrl(tool));
    }
  });

  it('has no metadata for a slug that is not in the registry', () => {
    expect(generateMetadata({ params: { slug: 'no-such-tool' } })).toEqual({});
  });
});
