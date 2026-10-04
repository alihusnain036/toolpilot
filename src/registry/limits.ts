/**
 * Input size caps and accepted file types, shared by the registry entries.
 *
 * The caps are the recorded answer behind REQ-4: 25 MB per image, 100 MB per
 * PDF, 10 MB of text. They are soft caps enforced in the browser before any
 * processing starts — there is no server to fall back to.
 *
 * This module holds no zod and no tool data, so importing a cap from
 * `tools.ts` does not drag the validation schema into a page bundle.
 */

/** 25 MiB — the per-image cap for every image tool. */
export const MAX_IMAGE_BYTES = 26_214_400;

/** 100 MiB — the per-document cap for every PDF tool. */
export const MAX_PDF_BYTES = 104_857_600;

/** 10 MiB — the cap on pasted or loaded text. */
export const MAX_TEXT_BYTES = 10_485_760;

/**
 * Accepted still-image inputs. Both MIME types and extensions are listed: the
 * MIME types are what a drop event reports, the extensions are what a file
 * picker's `accept` attribute needs on the platforms that ignore MIME types.
 */
export const IMAGE_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
] as const;

/** Accepted PDF inputs. */
export const PDF_FILE_TYPES = ['application/pdf', '.pdf'] as const;
