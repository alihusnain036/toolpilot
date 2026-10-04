import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseEnv } from './env';

describe('parseEnv', () => {
  it('parses a valid absolute https URL', () => {
    const result = parseEnv({ NEXT_PUBLIC_SITE_URL: 'https://toolpilot.app' });
    expect(result.NEXT_PUBLIC_SITE_URL).toBe('https://toolpilot.app');
  });

  it('accepts an http localhost URL for local development', () => {
    const result = parseEnv({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' });
    expect(result.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
  });

  it('strips trailing slashes so callers can concatenate paths safely', () => {
    const result = parseEnv({
      NEXT_PUBLIC_SITE_URL: 'https://toolpilot.app//',
    });
    expect(result.NEXT_PUBLIC_SITE_URL).toBe('https://toolpilot.app');
  });

  it('throws when NEXT_PUBLIC_SITE_URL is absent', () => {
    expect(() => parseEnv({})).toThrowError(/NEXT_PUBLIC_SITE_URL is required/);
  });

  it('throws when NEXT_PUBLIC_SITE_URL is an empty string', () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: '' })).toThrowError(
      /NEXT_PUBLIC_SITE_URL/,
    );
  });

  it('throws when NEXT_PUBLIC_SITE_URL is not an absolute URL', () => {
    expect(() =>
      parseEnv({ NEXT_PUBLIC_SITE_URL: 'toolpilot.app' }),
    ).toThrowError(/must be an absolute URL/);
  });

  it('throws when NEXT_PUBLIC_SITE_URL uses an unsupported protocol', () => {
    expect(() =>
      parseEnv({ NEXT_PUBLIC_SITE_URL: 'ftp://toolpilot.app' }),
    ).toThrowError(/must use http or https/);
  });

  it('throws when NEXT_PUBLIC_SITE_URL is not a string', () => {
    expect(() => parseEnv({ NEXT_PUBLIC_SITE_URL: 42 })).toThrowError(
      /must be a string/,
    );
  });

  it('rejects the committed localhost default in a production deploy', () => {
    // The committed .env exists so `pnpm dev` needs no setup. If a production
    // deploy is missing the variable it would otherwise inherit that default
    // and ship localhost canonical URLs; this is what stops it.
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
        VERCEL_ENV: 'production',
      }),
    ).toThrowError(/not a public https origin/);
  });

  it('rejects a plain-http origin in a production deploy', () => {
    expect(() =>
      parseEnv({
        NEXT_PUBLIC_SITE_URL: 'http://toolpilot.app',
        VERCEL_ENV: 'production',
      }),
    ).toThrowError(/not a public https origin/);
  });

  it('accepts a public https origin in a production deploy', () => {
    const result = parseEnv({
      NEXT_PUBLIC_SITE_URL: 'https://toolpilot.app',
      VERCEL_ENV: 'production',
    });
    expect(result.NEXT_PUBLIC_SITE_URL).toBe('https://toolpilot.app');
  });

  it('leaves preview and local builds free to use any valid URL', () => {
    for (const vercelEnv of ['preview', 'development', undefined]) {
      const result = parseEnv({
        NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
        VERCEL_ENV: vercelEnv,
      });
      expect(result.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
    }
  });

  it('reports the variable name in the error so the failure is actionable', () => {
    expect(() => parseEnv({})).toThrowError(
      /Invalid environment configuration/,
    );
  });
});

describe('env module load', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
    vi.resetModules();
  });

  it('throws on import when NEXT_PUBLIC_SITE_URL is absent', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.resetModules();

    await expect(import('./env')).rejects.toThrowError(
      /NEXT_PUBLIC_SITE_URL is required/,
    );
  });

  it('exposes siteUrl when NEXT_PUBLIC_SITE_URL is valid', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.toolpilot.app/';
    vi.resetModules();

    const mod = await import('./env');
    expect(mod.siteUrl).toBe('https://preview.toolpilot.app');
  });
});
