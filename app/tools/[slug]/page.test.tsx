import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ToolPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from './page';

/**
 * The route's build-time contract: one prerendered page per published tool, no
 * page for anything else, and every word on it taken from the registry entry.
 *
 * The committed registry has no published tool yet — each tool's own ticket
 * flips its flag — so asserting against it would assert against an empty list
 * and prove nothing. The registry module is therefore bound to the test
 * fixture, which has published tools, an unpublished one and a tool listed
 * under two categories. `next/navigation` is stubbed so `notFound()` is
 * observable as a throw, and the stub tool component keeps the dynamic-import
 * boundary in the test without a real tool existing yet.
 */

vi.mock('next/navigation', () => ({
  notFound: (): never => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/registry')>();
  const { createElement } = await import('react');
  const { fixtureRegistry } = await import('@/registry/fixtures');
  const { selectPublishedTools, selectToolBySlug } = await import(
    '@/registry/select'
  );

  return {
    ...actual,
    getPublishedTools: () => selectPublishedTools(fixtureRegistry),
    getToolBySlug: (slug: string) => selectToolBySlug(fixtureRegistry, slug),
    getToolComponentLoader: (slug: string) =>
      slug === 'alpha-tool'
        ? () =>
            Promise.resolve({
              default: () =>
                createElement('p', null, 'the alpha tool component'),
            })
        : undefined,
  };
});

/** The fixture's published slugs, in registry order. */
const PUBLISHED_SLUGS = [
  'zulu-tool',
  'alpha-tool',
  'two-category-tool',
  'image-fixture-tool',
];

describe('tool route static params', () => {
  it('generates one param per published tool', () => {
    expect(generateStaticParams()).toEqual(
      PUBLISHED_SLUGS.map((slug) => ({ slug })),
    );
  });

  it('generates no param for an unpublished tool', () => {
    expect(generateStaticParams()).not.toContainEqual({
      slug: 'unpublished-tool',
    });
  });

  it('refuses to render a slug it did not generate', () => {
    // dynamicParams = false is what turns an unpublished or unknown slug into
    // a 404 instead of an on-demand render.
    expect(dynamicParams).toBe(false);
  });
});

describe('tool route metadata', () => {
  it('takes the title, description and canonical URL from the entry', () => {
    const metadata = generateMetadata({ params: { slug: 'alpha-tool' } });

    expect(metadata.title).toBe('Alpha Tool');
    expect(metadata.description).toBe('A tool that exists only in the tests.');
    expect(metadata.alternates?.canonical).toBe('/tools/alpha-tool');
  });

  it('gives a tool in two categories the one canonical URL', () => {
    const metadata = generateMetadata({
      params: { slug: 'two-category-tool' },
    });

    expect(metadata.alternates?.canonical).toBe('/tools/two-category-tool');
  });

  it('has no metadata for an unpublished tool', () => {
    expect(
      generateMetadata({ params: { slug: 'unpublished-tool' } }),
    ).toEqual({});
  });

  it('has no metadata for a slug that is not in the registry', () => {
    expect(generateMetadata({ params: { slug: 'no-such-tool' } })).toEqual({});
  });
});

describe('tool page', () => {
  it('renders the name and description from the registry entry', async () => {
    render(await ToolPage({ params: { slug: 'zulu-tool' } }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'Zulu Tool' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('A tool that exists only in the tests.'),
    ).toBeInTheDocument();
  });

  it('renders the dynamically imported tool component when one is wired up', async () => {
    render(await ToolPage({ params: { slug: 'alpha-tool' } }));

    expect(screen.getByText('the alpha tool component')).toBeInTheDocument();
  });

  it('does not render a tool component for an entry with no loader', async () => {
    render(await ToolPage({ params: { slug: 'zulu-tool' } }));

    expect(
      screen.queryByText('the alpha tool component'),
    ).not.toBeInTheDocument();
  });

  it('404s for an unpublished tool rather than rendering an empty page', async () => {
    await expect(
      ToolPage({ params: { slug: 'unpublished-tool' } }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('404s for a slug that is not in the registry', async () => {
    await expect(ToolPage({ params: { slug: 'no-such-tool' } })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
