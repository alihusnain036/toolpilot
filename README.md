# ToolPilot

A collection of small, fast online tools — PDF, image and QR work — that run
**entirely in the visitor's browser**. Nothing anyone uploads leaves their
machine, because there is nowhere for it to go: ToolPilot is a statically
generated site with no backend at all.

Built with Next.js 14 (App Router), TypeScript and Tailwind CSS. Deployed to
Vercel as static files.

---

## Getting started

You need **Node 20** (the version in `.nvmrc`) and **pnpm**, which comes with
Node via corepack:

```sh
corepack enable pnpm
pnpm install
```

Then create a `.env.local`, or rely on the committed `.env` (a non-secret
default pointing at localhost):

```sh
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

This is the only environment variable the project has, and it is not a secret —
it is the site's own public URL, used for canonical links and metadata.
`src/config/env.ts` validates it at module load, so a missing or malformed value
fails the build instead of shipping broken URLs. The committed `.env` is a
convenience for local work, and it is deliberately not allowed to stand in for
the real thing: when Vercel builds with `VERCEL_ENV=production`, a localhost or
plain-`http` value is rejected, so a production deploy with the variable unset
fails loudly instead of shipping localhost canonical URLs. **There are no
secrets in this project.** If one is ever needed, it does not belong in a `NEXT_PUBLIC_*`
variable, because Next inlines those into the public bundle.

```sh
pnpm dev     # development server on http://localhost:3000
pnpm build   # typecheck, lint, then a production build
pnpm start   # serve the production build locally
```

## Commands

| Command             | What it does                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Development server with hot reload                                                            |
| `pnpm build`        | **typecheck → lint → `next build`.** A build cannot succeed with a type error or a lint error |
| `pnpm start`        | Serves the built output                                                                       |
| `pnpm typecheck`    | `tsc --noEmit` — `strict` plus `noUncheckedIndexedAccess`                                     |
| `pnpm lint`         | ESLint over `app/`, `src/` and `scripts/`; any error, and any warning, fails                  |
| `pnpm test`         | Vitest once, over `app/`, `src/` and `scripts/`                                               |
| `pnpm test:watch`   | Vitest in watch mode                                                                          |
| `pnpm format`       | Prettier, writing changes (includes Tailwind class sorting)                                   |
| `pnpm format:check` | Prettier, checking only                                                                       |
| `pnpm guard`        | The no-backend guard — see below                                                              |
| `pnpm licences`     | Lists every production dependency's licence and fails on a copyleft one                       |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, licences, guard and
build on every pull request and on every push to `main`. All of them must pass.

## Layout

```
app/                    Routes. Everything here is prerendered at build time.
  layout.tsx            Root layout: fonts, metadata, <html>/<body>
  globals.css           The design tokens live here
src/
  config/env.ts         The one environment variable, validated with zod
scripts/
  guard-no-backend.mjs  Fails the build if a backend appears
  check-licences.mjs    Fails the build on a non-permissive licence
docs/
  deploy.md             Vercel setup, and the security headers explained
  decisions/            Why things are the way they are
```

Tests sit next to what they test (`app/layout.test.tsx`,
`src/config/env.test.ts`, `scripts/*.test.ts`).

---

## Three rules

These are the ones that are easy to break by accident, so each is enforced by
something that runs in CI, and each has a decision record explaining it.

### 1. No backend

**There is no server-side code in ToolPilot, and there must not be.** No API
routes or route handlers, no server actions, no middleware, no database, no
object store, no upload endpoint. Every route is statically generated; every
tool runs in the browser. Per-visitor state goes in `localStorage`.

This is what makes the privacy claim true rather than promised — a file a
visitor opens cannot be sent anywhere, because there is no endpoint to send it
to.

`pnpm guard` enforces it. It fails on `app/**/route.ts`, `pages/api/**`,
`'use server'`, `middleware.ts`, `next/headers`, `next/cookies`,
`export const dynamic = 'force-dynamic'`, `export const runtime`, and on a
database, storage or upload client being imported **or merely listed in
`package.json`**. ESLint catches the common cases earlier, in your editor.

If you hit the guard, the answer is almost always to do the work in the browser.
If it genuinely cannot be done there, that is a product decision and needs a
requirement — not a deleted guard rule.
→ [`docs/decisions/0001-no-backend.md`](docs/decisions/0001-no-backend.md)

### 2. Permissive licences only

Dependencies are shipped to every visitor in the bundle, so every **production**
dependency — direct or transitive — must be `MIT`, `Apache-2.0`,
`BSD-2-Clause`, `BSD-3-Clause`, `ISC` or `0BSD`. A GPL, AGPL, LGPL, SSPL,
non-commercial or undeclared licence fails the build.

Run `pnpm licences` before opening a pull request that adds a dependency. Dev
dependencies are not checked — they are never distributed. There is one recorded
exception (`caniuse-lite`, which Next pulls in), explained in the record.
→ [`docs/decisions/0003-dependency-licences.md`](docs/decisions/0003-dependency-licences.md)

### 3. Heavy libraries load dynamically

`pdf-lib`, `pdf.js`, image codecs, QR libraries and anything else large are
loaded **only** via `await import()`, inside a client component or a worker, at
the moment the work is requested. **Never at the top level of a module, and
especially never in a shared one** — a bundler cannot tell that an unrelated
helper in that module does not need the library, so it pulls it into the common
chunk and every visitor pays for every tool.

```ts
// Yes
export async function mergePdfs(files: File[]) {
  const { PDFDocument } = await import('pdf-lib');
}

// No — pdf-lib is now in the shared bundle
import { PDFDocument } from 'pdf-lib';
```

Use `ssr: false` for components that touch browser APIs, and show a loading
state: a dynamic import takes real time on a real connection. Watch the First
Load JS column in `next build`'s route table — a jump in the shared chunk means
this rule was broken.
→ [`docs/decisions/0004-dynamic-imports.md`](docs/decisions/0004-dynamic-imports.md)

---

## Styling

The theme is **CSS custom properties** declared in `app/globals.css`: one token
set, two value sets (`:root` is light, `.dark` overrides it), read by Tailwind
through `tailwind.config.ts`. `darkMode` is `'class'`.

So `bg-background`, `text-foreground` and `border-border` are already correct in
both themes — **you should not need a `dark:` variant for a themed colour.** If
one shows up in a diff, something is reaching past the token set.

The current token _values_ are Tailwind defaults standing in for a design that
has not landed yet. The names are the contract; the values will be replaced.
→ [`docs/decisions/0002-design-tokens.md`](docs/decisions/0002-design-tokens.md)

## Deploying

Vercel builds from the repository: a branch or pull request gets a preview
deployment, `main` gets production. CI is the gate, not the deployer — it holds
no deployment credentials.

The response headers (HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options` and
a CSP that permits no third-party origin at all) are in `vercel.json`.
→ [`docs/deploy.md`](docs/deploy.md) for the dashboard settings a person has to
make, and for why the CSP carries `'unsafe-inline'`.
