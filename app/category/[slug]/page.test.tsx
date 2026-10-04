import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CategoryPage, {
  dynamicParams,
  generateMetadata,
  generateStaticParams,
} from './page';

/**
 * One prerendered page per category, each listing exactly its own published
 * tools and linking to each of them at the one canonical URL.
 *
 * The five categories are real registry data, so `getCategories()` and
 * `getCategoryBySlug()` are left alone. Only the tool lookup is bound to the
 * test fixture: the committed registry has no published tool yet, so every real
 * category page is empty today and could not show that a tool listed under two
 * categories appears on both with the same link (REQ-2 criterion 5).
 */

vi.mock('next/navigation', () => ({
  notFound: (): never => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('@/registry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/registry')>();
  const { fixtureRegistry } = await import('@/registry/fixtures');
  const { selectToolsByCategory } = await import('@/registry/select');

  return {
    ...actual,
    getToolsByCategory: (categorySlug: string) =>
      selectToolsByCategory(fixtureRegistry, categorySlug),
  };
});

/**
 * Every tool link on a rendered category page, in document order.
 *
 * Queried through the container this render returned rather than through
 * `screen`, so a test that renders two category pages reads each one's links
 * and not the other's.
 */
function renderedToolLinks(slug: string): { name: string; href: string }[] {
  const { container } = render(CategoryPage({ params: { slug } }));
  return [...container.querySelectorAll('a')].map((link) => ({
    name: link.textContent ?? '',
    href: link.getAttribute('href') ?? '',
  }));
}

describe('category route static params', () => {
  it('generates one param per category', () => {
    expect(generateStaticParams()).toEqual([
      { slug: 'developer-tools' },
      { slug: 'image-tools' },
      { slug: 'pdf-tools' },
      { slug: 'text-tools' },
      { slug: 'generators' },
    ]);
  });

  it('refuses to render a category it did not generate', () => {
    expect(dynamicParams).toBe(false);
  });
});

describe('category route metadata', () => {
  it('takes its metadata from the category definition', () => {
    const metadata = generateMetadata({ params: { slug: 'image-tools' } });

    expect(metadata.title).toBe('Image Tools');
    expect(metadata.alternates?.canonical).toBe('/category/image-tools');
  });

  it('has no metadata for a category outside the five', () => {
    expect(generateMetadata({ params: { slug: 'crypto-tools' } })).toEqual({});
  });
});

describe('category page', () => {
  it('names the category and shows its description', () => {
    render(CategoryPage({ params: { slug: 'pdf-tools' } }));

    expect(
      screen.getByRole('heading', { level: 1, name: 'PDF Tools' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Merge, split and build PDF documents right in your browser.',
      ),
    ).toBeInTheDocument();
  });

  it('lists the category’s published tools, alphabetically by name', () => {
    expect(
      renderedToolLinks('developer-tools').map((link) => link.name),
    ).toEqual(['Alpha Tool', 'Mid Two-Category Tool', 'Zulu Tool']);
  });

  it('lists no unpublished tool', () => {
    expect(
      renderedToolLinks('developer-tools').map((link) => link.name),
    ).not.toContain('Unpublished Tool');
  });

  it('links a tool in two categories to the same URL from both pages', () => {
    const fromDeveloperTools = renderedToolLinks('developer-tools').find(
      (link) => link.name === 'Mid Two-Category Tool',
    );
    const fromGenerators = renderedToolLinks('generators').find(
      (link) => link.name === 'Mid Two-Category Tool',
    );

    expect(fromDeveloperTools?.href).toBe('/tools/two-category-tool');
    expect(fromGenerators?.href).toBe(fromDeveloperTools?.href);
  });

  it('says so plainly when a category has nothing published in it yet', () => {
    render(CategoryPage({ params: { slug: 'text-tools' } }));

    expect(
      screen.getByText(/No tools in this category yet/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('404s for a category outside the five', () => {
    expect(() => CategoryPage({ params: { slug: 'crypto-tools' } })).toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});
