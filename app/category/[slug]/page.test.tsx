import { describe, expect, it } from 'vitest';

import { categoryUrl, getCategories } from '@/registry';

import { dynamicParams, generateMetadata, generateStaticParams } from './page';

describe('category route', () => {
  it('generates one static param per category', () => {
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

  it('takes its metadata from the category definition', () => {
    for (const category of getCategories()) {
      const metadata = generateMetadata({ params: { slug: category.slug } });
      expect(metadata.title).toBe(category.name);
      expect(metadata.description).toBe(category.description);
      expect(metadata.alternates?.canonical).toBe(categoryUrl(category));
    }
  });

  it('has no metadata for a category outside the five', () => {
    expect(generateMetadata({ params: { slug: 'crypto-tools' } })).toEqual({});
  });
});
