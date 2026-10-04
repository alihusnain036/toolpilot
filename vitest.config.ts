import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['{app,src,scripts,tests}/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'out'],
    env: {
      // The suite needs a valid value so importing src/config/env.ts succeeds;
      // the tests that assert failure delete it and reset the module registry.
      NEXT_PUBLIC_SITE_URL: 'https://toolpilot.test',
    },
    css: true,
  },
});
