import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * next/font only works inside Next's compiler: it downloads and self-hosts the
 * font files at build time. In tests we replace each loader we use with a stub
 * that returns the same shape Next produces — a class name, a CSS variable
 * name and a style object — so no network request happens.
 *
 * Mock the loaders explicitly rather than with a Proxy: a Proxy that answers
 * every property with a function also answers `then`, which makes the module
 * namespace look like a thenable and hangs `await import(...)` forever.
 */
function fontLoaderStub(variable: string) {
  return () => ({
    className: `mock-${variable.replace(/^--/, '')}`,
    variable,
    style: { fontFamily: variable },
  });
}

vi.mock('next/font/google', () => ({
  Inter: fontLoaderStub('--font-sans'),
  JetBrains_Mono: fontLoaderStub('--font-mono'),
}));

vi.mock('next/font/local', () => ({
  default: fontLoaderStub('--font-local'),
}));

afterEach(() => {
  cleanup();
});
