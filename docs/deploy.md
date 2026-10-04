# Deploying ToolPilot

ToolPilot is a statically generated Next.js site with no backend. Every route is
prerendered at build time and every tool runs in the visitor's browser, so
deployment is: build, upload files, serve them over HTTPS from a CDN.

Hosting is Vercel. `vercel.json` in the repository root holds everything that
can be expressed as code — the framework preset, the install and build commands
and the response headers. The rest is dashboard configuration, and this document
is the record of it, because the dashboard is not in version control.

## How a deploy happens

CI (`.github/workflows/ci.yml`) is the gate and Vercel is the deployer. They are
deliberately separate: CI never holds a deployment token, and Vercel builds from
the git repository itself.

| Trigger                     | What Vercel does                                |
| --------------------------- | ----------------------------------------------- |
| Push to any branch, or a PR | Builds a **Preview** deployment at a unique URL |
| Push to `main`              | Builds and promotes a **Production** deployment |

Both are served over HTTPS with the headers below. Vercel terminates TLS and
redirects HTTP to HTTPS; nothing in the app needs to do that.

## One-time setup a person must do

1. **Create the Vercel project** and connect it to this git repository.
   - Framework preset: **Next.js** (`vercel.json` already declares it).
   - Root directory: the repository root.
   - Build and install commands: leave Vercel to read them from `vercel.json`.
2. **Set the Node.js version to 20.x** in
   _Project → Settings → General → Node.js Version_. This has no `vercel.json`
   equivalent for a project with no serverless functions. `engines.node` in
   `package.json` (`>=20.0.0 <21`) and `.nvmrc` pin it everywhere else; the
   dashboard setting is what makes the Vercel builder agree.
3. **Set the one environment variable** in
   _Project → Settings → Environment Variables_:

   | Variable               | Environment | Value                             |
   | ---------------------- | ----------- | --------------------------------- |
   | `NEXT_PUBLIC_SITE_URL` | Production  | `https://<production-domain>`     |
   | `NEXT_PUBLIC_SITE_URL` | Preview     | `https://$VERCEL_URL` — see below |

   For Preview, Vercel offers a system environment variable
   `VERCEL_URL` (the deployment's own hostname, without a scheme). Either set
   `NEXT_PUBLIC_SITE_URL` to a fixed staging URL, or enable
   _Automatically expose System Environment Variables_ and set
   `NEXT_PUBLIC_SITE_URL=https://$NEXT_PUBLIC_VERCEL_URL`. It is only used for
   canonical URLs and metadata, so a preview pointing at its own hostname is
   correct.

   `src/config/env.ts` validates this variable at module load, so a deploy with
   it missing or malformed fails the build rather than shipping broken canonical
   URLs. A committed `.env` holds `http://localhost:3000` so local work needs no
   setup, and a production build refuses it: when `VERCEL_ENV` is `production`,
   a loopback host or a plain-`http` origin fails the build. Forgetting to set
   this variable for Production therefore stops the deploy instead of quietly
   publishing localhost URLs. **There are no secrets to set.** v1 has no backend, no API keys and no
   credentials of any kind; if a future change needs one, it does not belong in
   a `NEXT_PUBLIC_*` variable, because Next inlines those into the public bundle.

4. **Point the production domain at Vercel.** Add the domain in
   _Project → Settings → Domains_ and follow the DNS records it shows (an `A`
   record for an apex domain, or a `CNAME` to `cname.vercel-dns.com` for a
   subdomain). Vercel issues and renews the TLS certificate.
5. **Require CI to pass before merge.** In GitHub, under
   _Settings → Branches → Branch protection rules_ for `main`, require the
   `verify` check from the CI workflow. CI blocking a merge is what keeps the
   typecheck, lint, test, licence and no-backend checks meaningful.

Nothing above needs to be repeated per deploy.

## The response headers, and why they are shaped this way

All of these are set in `vercel.json` for every path.

- **`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`** —
  two years, subdomains included. Once a browser has seen this it will not make
  a plaintext request to the domain again.
- **`X-Content-Type-Options: nosniff`** — a file served as `text/plain` is never
  guessed into a script.
- **`Referrer-Policy: strict-origin-when-cross-origin`** — an outbound link
  leaks the origin, never the path. ToolPilot's paths name the tool a visitor
  was using; that is their business.
- **`X-Frame-Options: DENY`** — plus `frame-ancestors 'none'` in the CSP, which
  is the modern equivalent. Both are sent because old browsers only honour the
  first.
- **`Cross-Origin-Opener-Policy: same-origin`** — severs the `window.opener`
  relationship, so a page ToolPilot opens cannot reach back into it.
- **`Permissions-Policy`** — camera, microphone, geolocation, payment and USB
  are all denied. No v1 tool needs any of them.
- **`Content-Security-Policy`** — the important one. In full:

  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' blob: data:;
  worker-src 'self' blob:;
  media-src 'self' blob:;
  manifest-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests
  ```

  There is **no third-party origin anywhere in it**. No CDN, no analytics host,
  no font service — fonts are self-hosted through `next/font`, which is why
  `font-src` can stay at `'self'`. If a later ticket wants a third-party script,
  it has to change this file, and that change is visible in review. That is the
  point of writing it down rather than leaving the default.

  Two allowances deserve an honest explanation:

  - **`'unsafe-inline'` in `script-src`.** A statically generated site has no
    per-request step, so it cannot mint a per-response nonce — the HTML is
    written once at build time and served from a CDN to everyone. Next's
    prerendered pages carry inline bootstrap scripts (the `self.__next_f.push`
    hydration payload), so the alternative to `'unsafe-inline'` is a hash list
    regenerated on every build, which drifts silently the moment it is wrong.
    The exposure this leaves is XSS via injected inline script; what limits it
    here is that ToolPilot renders no user-supplied HTML and fetches nothing
    from a server, so there is no injection path through content. If v1 ever
    renders untrusted markup, this needs revisiting before that ships.
  - **`'unsafe-inline'` in `style-src`.** Same reason, plus React writes inline
    `style` attributes. Inline styles are a much smaller risk than inline
    scripts.

  And two allowances that exist for the tools themselves:

  - **`blob:` in `script-src`, `worker-src`, `connect-src` and `img-src`.** The
    PDF, image and QR tools do their work in Web Workers created from blob URLs
    and hand results back as blobs for download. Without `blob:` in
    `worker-src`, no tool can move work off the main thread.
  - **`'wasm-unsafe-eval'`.** `pdf.js` and the image codecs compile
    WebAssembly. This keyword allows exactly that and nothing else — it does not
    re-enable `eval`.

## Checking a deploy

```sh
curl -sSI https://<deployment-url>/ | grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer'
```

Every header above should come back, and the request should have been served
over HTTPS. If `Content-Security-Policy` is missing, `vercel.json` was not
picked up — confirm the project's root directory is the repository root.

## What is deliberately not here

- **No deploy step in CI.** Vercel's git integration already builds every push.
  A second deployer means two ways to ship and a token in GitHub to steal.
- **No `output: 'export'`.** The build is statically generated without it (every
  route reports `○ (Static)`), and leaving it off keeps `next/image`
  optimisation and MDX available to later tickets. The no-backend guard, not the
  export mode, is what holds the line — see
  `docs/decisions/0001-no-backend.md`.
- **No serverless functions, cron jobs, edge config or KV store.** There is
  nothing in v1 to put in them, and `scripts/guard-no-backend.mjs` fails the
  build if something tries.
