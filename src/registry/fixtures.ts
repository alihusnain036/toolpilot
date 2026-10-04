import { IMAGE_FILE_TYPES, MAX_IMAGE_BYTES, MAX_TEXT_BYTES } from './limits';
import type { ToolEntry } from './types';

/**
 * Test-only registry fixtures.
 *
 * The committed registry cannot exercise everything the selectors have to
 * handle: in v1 no tool is listed under two categories, and (until each
 * tool's own ticket lands) none is published. These fixtures cover those
 * cases without inventing tools on the real site.
 *
 * Nothing that ships imports this file.
 */

/** A valid entry, with any field overridden. */
export function makeToolEntry(overrides: Partial<ToolEntry> = {}): ToolEntry {
  return {
    slug: 'fixture-tool',
    name: 'Fixture Tool',
    shortDescription: 'A tool that exists only in the tests.',
    primaryCategory: 'developer-tools',
    keywords: ['fixture', 'test tool'],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'Beaker',
    published: true,
    ...overrides,
  };
}

/**
 * A small registry: two single-category tools (deliberately out of
 * alphabetical order), one tool in two categories, one unpublished tool and
 * one file-based tool.
 */
export const fixtureRegistry: readonly ToolEntry[] = [
  makeToolEntry({
    slug: 'zulu-tool',
    name: 'Zulu Tool',
    primaryCategory: 'developer-tools',
  }),
  makeToolEntry({
    slug: 'alpha-tool',
    name: 'Alpha Tool',
    primaryCategory: 'developer-tools',
  }),
  makeToolEntry({
    slug: 'two-category-tool',
    name: 'Mid Two-Category Tool',
    primaryCategory: 'developer-tools',
    additionalCategories: ['generators'],
  }),
  makeToolEntry({
    slug: 'unpublished-tool',
    name: 'Unpublished Tool',
    primaryCategory: 'developer-tools',
    published: false,
  }),
  makeToolEntry({
    slug: 'image-fixture-tool',
    name: 'Image Fixture Tool',
    primaryCategory: 'image-tools',
    inputKind: 'file',
    acceptedFileTypes: IMAGE_FILE_TYPES,
    maxInputBytes: MAX_IMAGE_BYTES,
    icon: 'Image',
  }),
];

/** Component slugs matching the published entries of `fixtureRegistry`. */
export const fixtureComponentSlugs: readonly string[] = [
  'zulu-tool',
  'alpha-tool',
  'two-category-tool',
  'image-fixture-tool',
];
