import {
  IMAGE_FILE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_TEXT_BYTES,
  PDF_FILE_TYPES,
} from './limits';
import type { ToolEntry } from './types';

/**
 * Every tool ToolPilot knows about.
 *
 * **This is the only file in the repository that enumerates tools.** Routes,
 * the home catalogue, category pages, the search index, metadata, JSON-LD and
 * the sitemap are all generated from this array, so adding or removing a tool
 * is an edit here plus (for a new tool) one component wired in
 * `components.ts`. Nothing else lists tools by hand.
 *
 * `published` starts as `false` for every v1 tool. Each tool's own ticket
 * builds its component and flips its flag in the same change, so the site
 * never routes a page that has no tool on it — see `README.md` in this folder.
 */
export const TOOLS = [
  // ── Developer Tools ──────────────────────────────────────────────────────
  {
    slug: 'json-formatter',
    name: 'JSON Formatter & Validator',
    shortDescription:
      'Format, minify and validate JSON, with the line and column of any error.',
    primaryCategory: 'developer-tools',
    keywords: [
      'json',
      'json formatter',
      'json validator',
      'pretty print',
      'beautify',
      'prettify',
      'minify',
      'lint',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'Braces',
    published: false,
  },
  {
    slug: 'base64-encoder-decoder',
    name: 'Base64 Encoder / Decoder',
    shortDescription:
      'Encode text to Base64 or decode it back, with a URL-safe option.',
    primaryCategory: 'developer-tools',
    keywords: [
      'base64',
      'base-64',
      'b64',
      'encode',
      'decode',
      'url-safe',
      'btoa',
      'atob',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'Binary',
    published: false,
  },
  {
    slug: 'jwt-decoder',
    name: 'JWT Decoder',
    shortDescription:
      "Decode a JSON Web Token's header and payload on your own device.",
    primaryCategory: 'developer-tools',
    keywords: [
      'jwt',
      'json web token',
      'token',
      'decode',
      'claims',
      'bearer',
      'auth',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'KeyRound',
    published: false,
  },
  {
    slug: 'regex-tester',
    name: 'Regex Tester',
    shortDescription:
      'Test a JavaScript regular expression against your text and see every match.',
    primaryCategory: 'developer-tools',
    keywords: [
      'regex',
      'regexp',
      'regular expression',
      'pattern',
      'match',
      'replace',
      'test',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'Regex',
    published: false,
  },

  // ── Image Tools ─────────────────────────────────────────────────────────
  {
    slug: 'image-compressor',
    name: 'Image Compressor',
    shortDescription:
      'Shrink a JPEG, PNG or WebP image without changing its dimensions.',
    primaryCategory: 'image-tools',
    keywords: [
      'compress image',
      'shrink image',
      'reduce image size',
      'optimise image',
      'optimize image',
      'jpeg',
      'png',
      'webp',
    ],
    inputKind: 'file',
    acceptedFileTypes: IMAGE_FILE_TYPES,
    maxInputBytes: MAX_IMAGE_BYTES,
    icon: 'ImageMinus',
    published: false,
  },
  {
    slug: 'image-resizer',
    name: 'Image Resizer',
    shortDescription:
      'Resize an image to exact pixel dimensions or by a percentage.',
    primaryCategory: 'image-tools',
    keywords: [
      'resize image',
      'scale image',
      'image dimensions',
      'resize photo',
      'width',
      'height',
    ],
    inputKind: 'file',
    acceptedFileTypes: IMAGE_FILE_TYPES,
    maxInputBytes: MAX_IMAGE_BYTES,
    icon: 'Scaling',
    published: false,
  },
  {
    slug: 'image-format-converter',
    name: 'Image Format Converter',
    shortDescription:
      'Convert an image between JPEG, PNG and WebP in either direction.',
    primaryCategory: 'image-tools',
    keywords: [
      'convert image',
      'image format',
      'jpg to webp',
      'png to jpg',
      'webp to png',
      'jpeg',
      'webp',
    ],
    inputKind: 'file',
    acceptedFileTypes: IMAGE_FILE_TYPES,
    maxInputBytes: MAX_IMAGE_BYTES,
    icon: 'Replace',
    published: false,
  },
  {
    slug: 'image-metadata-remover',
    name: 'Image Metadata / EXIF Remover',
    shortDescription:
      'Strip EXIF, GPS and other metadata from an image before you share it.',
    primaryCategory: 'image-tools',
    keywords: [
      'exif',
      'metadata',
      'remove exif',
      'strip metadata',
      'gps',
      'geotag',
      'privacy',
    ],
    inputKind: 'file',
    acceptedFileTypes: IMAGE_FILE_TYPES,
    maxInputBytes: MAX_IMAGE_BYTES,
    icon: 'Eraser',
    published: false,
  },

  // ── PDF Tools ───────────────────────────────────────────────────────────
  {
    slug: 'merge-pdf',
    name: 'Merge PDF',
    shortDescription:
      'Combine several PDF files into one, in the order you choose.',
    primaryCategory: 'pdf-tools',
    keywords: [
      'merge pdf',
      'combine pdf',
      'join pdf',
      'concatenate pdf',
      'pdf merger',
    ],
    inputKind: 'file',
    acceptedFileTypes: PDF_FILE_TYPES,
    maxInputBytes: MAX_PDF_BYTES,
    icon: 'Combine',
    published: false,
  },
  {
    slug: 'split-pdf',
    name: 'Split PDF',
    shortDescription:
      'Extract a page range, split at chosen pages, or burst a PDF into single pages.',
    primaryCategory: 'pdf-tools',
    keywords: [
      'split pdf',
      'extract pages',
      'page range',
      'separate pdf',
      'pdf splitter',
    ],
    inputKind: 'file',
    acceptedFileTypes: PDF_FILE_TYPES,
    maxInputBytes: MAX_PDF_BYTES,
    icon: 'Scissors',
    published: false,
  },
  {
    slug: 'images-to-pdf',
    name: 'Images to PDF',
    shortDescription:
      'Turn JPEG, PNG or WebP images into a single PDF document.',
    primaryCategory: 'pdf-tools',
    keywords: [
      'images to pdf',
      'jpg to pdf',
      'png to pdf',
      'photos to pdf',
      'picture to pdf',
    ],
    inputKind: 'file',
    // Per-image cap: the combined-size cap is the tool's own rule, not the
    // registry's, because it is not a property of a single input.
    acceptedFileTypes: IMAGE_FILE_TYPES,
    maxInputBytes: MAX_IMAGE_BYTES,
    icon: 'FileImage',
    published: false,
  },

  // ── Text Tools ──────────────────────────────────────────────────────────
  {
    slug: 'word-character-counter',
    name: 'Word & Character Counter',
    shortDescription:
      'Count words, characters, sentences, paragraphs and reading time as you type.',
    primaryCategory: 'text-tools',
    keywords: [
      'word count',
      'character count',
      'letter count',
      'counter',
      'reading time',
      'words',
      'characters',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'Calculator',
    published: false,
  },
  {
    slug: 'case-converter',
    name: 'Case Converter',
    shortDescription:
      'Convert text to UPPERCASE, Title Case, camelCase, snake_case and more.',
    primaryCategory: 'text-tools',
    keywords: [
      'case converter',
      'uppercase',
      'lowercase',
      'title case',
      'sentence case',
      'camelcase',
      'pascalcase',
      'snake case',
      'kebab case',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'CaseSensitive',
    published: false,
  },

  // ── Generators ──────────────────────────────────────────────────────────
  {
    slug: 'qr-code-generator',
    name: 'QR Code Generator',
    shortDescription:
      'Generate a QR code for a link, some text or a Wi-Fi network.',
    primaryCategory: 'generators',
    keywords: [
      'qr code',
      'qr',
      'qr generator',
      'wifi qr',
      'barcode',
      'scan',
      'png',
      'svg',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'QrCode',
    published: false,
  },
  {
    slug: 'password-generator',
    name: 'Password Generator',
    shortDescription:
      'Generate a strong random password with the length and characters you want.',
    primaryCategory: 'generators',
    keywords: [
      'password',
      'random password',
      'strong password',
      'passphrase',
      'generate password',
      'secure password',
    ],
    inputKind: 'text',
    acceptedFileTypes: [],
    maxInputBytes: MAX_TEXT_BYTES,
    icon: 'KeySquare',
    published: false,
  },
] as const satisfies readonly ToolEntry[];

/** Every slug in the registry, as a union type. */
export type ToolSlug = (typeof TOOLS)[number]['slug'];
