// Environment validation lives in src/config/env.ts and runs at module load.
// app/layout.tsx imports it, so `next build` evaluates it while prerendering
// and a missing or malformed NEXT_PUBLIC_SITE_URL fails the build. It is not
// imported here because Next 14 cannot load a TypeScript config file.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // v1 is a static site: there is no backend, so there is nothing to run on a
  // server at request time. `next build` must prerender every route. The CI
  // guard (scripts/guard-no-backend.mjs) enforces the rest of this rule.
  poweredByHeader: false,
  trailingSlash: false,

  eslint: {
    // `pnpm build` runs `pnpm lint` first; this keeps `next build` from
    // silently skipping lint if it is ever invoked directly.
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
