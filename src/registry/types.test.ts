import { describe, expect, it } from 'vitest';

import { makeToolEntry } from './fixtures';
import { IMAGE_FILE_TYPES, MAX_IMAGE_BYTES } from './limits';
import { toolEntrySchema } from './types';

/** The first message zod reported, for readable assertions. */
function firstMessage(entry: unknown): string {
  const result = toolEntrySchema.safeParse(entry);
  if (result.success) return '';
  return result.error.issues.map((issue) => issue.message).join(' | ');
}

describe('toolEntrySchema', () => {
  it('accepts a valid text-tool entry', () => {
    const result = toolEntrySchema.safeParse(makeToolEntry());
    expect(result.success).toBe(true);
  });

  it('accepts a valid file-tool entry', () => {
    const result = toolEntrySchema.safeParse(
      makeToolEntry({
        slug: 'image-thing',
        inputKind: 'file',
        acceptedFileTypes: IMAGE_FILE_TYPES,
        maxInputBytes: MAX_IMAGE_BYTES,
      }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts an entry listed under a second category', () => {
    const result = toolEntrySchema.safeParse(
      makeToolEntry({ additionalCategories: ['generators'] }),
    );
    expect(result.success).toBe(true);
  });

  it.each([
    'Not A Slug',
    'UPPER-case',
    'trailing-',
    '-leading',
    'double--hyphen',
    'has space',
    'under_score',
    '',
  ])('rejects the malformed slug %o', (slug) => {
    expect(firstMessage(makeToolEntry({ slug }))).toMatch(
      /slug must be lowercase/,
    );
  });

  it('rejects a file tool with no accepted file types', () => {
    expect(
      firstMessage(makeToolEntry({ inputKind: 'file', acceptedFileTypes: [] })),
    ).toMatch(/file tool must accept at least one file type/);
  });

  it('rejects a text tool that lists accepted file types', () => {
    expect(
      firstMessage(
        makeToolEntry({ inputKind: 'text', acceptedFileTypes: ['.txt'] }),
      ),
    ).toMatch(/text tool must not list accepted file types/);
  });

  it('rejects a category outside the five', () => {
    const entry = { ...makeToolEntry(), primaryCategory: 'crypto-tools' };
    expect(firstMessage(entry)).toMatch(/crypto-tools/);
  });

  it('rejects an empty keyword list', () => {
    expect(firstMessage(makeToolEntry({ keywords: [] }))).toMatch(
      /at least one term/,
    );
  });

  it('rejects a multi-line short description', () => {
    expect(
      firstMessage(makeToolEntry({ shortDescription: 'one\ntwo' })),
    ).toMatch(/single line/);
  });

  it('rejects an icon name that is not a lucide PascalCase name', () => {
    expect(firstMessage(makeToolEntry({ icon: 'image-minus' }))).toMatch(
      /lucide-react icon name/,
    );
  });

  it('rejects a non-integer or negative size cap', () => {
    expect(firstMessage(makeToolEntry({ maxInputBytes: 0 }))).toMatch(
      /greater than zero/,
    );
    expect(firstMessage(makeToolEntry({ maxInputBytes: 1.5 }))).toMatch(
      /whole number of bytes/,
    );
  });

  it('rejects an unknown field, so a typo cannot be silently ignored', () => {
    const entry = { ...makeToolEntry(), descrption: 'typo' };
    expect(toolEntrySchema.safeParse(entry).success).toBe(false);
  });

  it('rejects a second category that repeats the primary one', () => {
    expect(
      firstMessage(
        makeToolEntry({
          primaryCategory: 'developer-tools',
          additionalCategories: ['developer-tools'],
        }),
      ),
    ).toMatch(/must not repeat primaryCategory/);
  });
});
