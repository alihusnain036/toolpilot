import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * next/font reaches the network at build time. In tests we stub it so a font
 * loader returns the same shape Next produces (a CSS variable and a class
 * name) without any fetch.
 */
vi.mock('next/font/google', () => {
  const loader = (): {
    className: string;
    variable: string;
    style: { fontFamily: string };
  } => ({
    className: 'mock-font',
    variable: '--font-mock',
    style: { fontFamily: 'mock-font' },
  });

  return new Proxy(
    {},
    {
      get: () => loader,
    },
  );
});

afterEach(() => {
  cleanup();
});
