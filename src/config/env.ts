import { z } from 'zod';

/**
 * Build-time configuration for ToolPilot.
 *
 * v1 has no backend and therefore no secrets: everything here is a
 * `NEXT_PUBLIC_*` value that Next inlines into the static bundle at build
 * time. Nothing in this file may read a credential, and nothing reads
 * configuration at runtime — see docs/decisions/0001-no-backend.md.
 *
 * The schema is evaluated at module load. Importing this module with a
 * missing or malformed variable throws, which fails `next build`.
 */
const envSchema = z.object({
  /**
   * Absolute, origin-only URL the site is served from. Used for canonical
   * URLs, sitemap and Open Graph metadata. Vercel sets this per environment
   * (preview and production); the committed `.env` holds the local default.
   */
  NEXT_PUBLIC_SITE_URL: z
    .string({
      required_error: 'NEXT_PUBLIC_SITE_URL is required',
      invalid_type_error: 'NEXT_PUBLIC_SITE_URL must be a string',
    })
    .min(1, 'NEXT_PUBLIC_SITE_URL must not be empty')
    .url(
      'NEXT_PUBLIC_SITE_URL must be an absolute URL, e.g. https://toolpilot.app',
    )
    .refine(
      (value) => {
        try {
          const { protocol } = new URL(value);
          return protocol === 'http:' || protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'NEXT_PUBLIC_SITE_URL must use http or https' },
    )
    .transform((value) => value.replace(/\/+$/, '')),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parses the environment, or throws an error naming every problem found.
 *
 * Exported so the unit test can exercise it directly without reloading the
 * module registry.
 */
export function parseEnv(
  source: NodeJS.ProcessEnv | Record<string, unknown>,
): Env {
  const result = envSchema.safeParse({
    // Referenced as a literal property so Next's build-time inlining of
    // `process.env.NEXT_PUBLIC_*` still applies in client bundles.
    NEXT_PUBLIC_SITE_URL: source['NEXT_PUBLIC_SITE_URL'],
  });

  if (!result.success) {
    const problems = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${problems}\n\n` +
        'Set the variable(s) above in .env.local for local work, or in the ' +
        'Vercel project settings for preview and production.',
    );
  }

  return result.data;
}

export const env: Env = parseEnv({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

/** Origin the site is served from, with any trailing slash removed. */
export const siteUrl: string = env.NEXT_PUBLIC_SITE_URL;
