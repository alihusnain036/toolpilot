# 0001 — ToolPilot v1 has no backend

- **Status:** Accepted
- **Date:** 2026-10-04
- **Applies to:** REQ-1, and every ticket that builds a tool

## Context

ToolPilot v1 is a set of small utilities — PDF, image and QR work — that a
visitor runs on their own files. Those files are often private: a scanned
passport, a signed contract, a photo of someone's children. The product's
central claim is that nothing a visitor touches leaves their machine.

A claim like that cannot be made by a privacy policy. It has to be true of the
architecture, and it is only true of the architecture if there is nowhere for a
file to go. So: every route is statically generated at build time, every tool
runs in the browser, and the deployed artefact is a directory of files on a CDN.

The risk is not that someone deliberately adds a database. It is that in six
months a ticket needs "just a small endpoint" — to log a conversion, to proxy a
font, to handle a file too big for the browser — and the claim quietly stops
being true while the policy still says it is.

## Decision

v1 ships with no server-side runtime of any kind. Specifically, none of the
following exists in the repository:

- API route handlers (`app/**/route.ts`) or pages API routes (`pages/api/**`)
- server actions (`'use server'`)
- middleware or an instrumentation hook — both run per request
- `export const dynamic = 'force-dynamic'`, `export const runtime = …`, or any
  other opt-out of static rendering
- `next/headers` or `next/cookies` — reading either forces per-request rendering
- a database, ORM, cache, object-store or upload-handling client, imported
  **or** merely declared in `package.json`

This is enforced three ways, deliberately overlapping:

1. **`scripts/guard-no-backend.mjs`** (`pnpm guard`) — scans every tracked and
   newly added file for the patterns above, plus `package.json` for the
   packages, and exits non-zero with the file, line and reason. CI runs it on
   every pull request and on `main`.
2. **ESLint** — `no-restricted-imports` and `no-restricted-syntax` catch the
   most likely cases in the editor, before anyone pushes. `pnpm lint` runs
   inside `pnpm build`, so a build cannot succeed past them.
3. **Review** — a change to the guard's own rules is a visible diff in a file
   whose only purpose is this decision.

Per-visitor state (recent files, preferences) lives in `localStorage`. There is
no account, no session and no server-side persistence.

## Consequences

- **Good:** the privacy claim is structurally true, not promised. The attack
  surface is a static file host. Hosting is cheap and scales without thought.
  There is no data to breach, no migration to run, no secret to rotate — v1 has
  no secrets at all, only `NEXT_PUBLIC_SITE_URL`, which is a public value.
- **Good:** no cold starts, no per-request latency, and a tool that works once
  works for everyone.
- **Bad:** some work is genuinely impractical in a browser — very large files,
  operations needing a licensed native binary. Those tools cannot be built under
  this decision, and the honest answer is to leave them out of v1 rather than
  compromise the claim for one feature.
- **Bad:** no server-side analytics, no server-side rate limiting, no
  server-rendered personalisation. Anything of that sort must be a client-side
  choice a visitor can see and decline.
- **Cost:** heavy libraries ship to the browser instead of running on a server.
  That is what [0004](./0004-dynamic-imports.md) exists to manage.

## If this needs to change

It may. A v2 with accounts, or a tool that cannot work client-side, is a
reasonable thing to want. But it is a product decision with a privacy
consequence, not a refactor: it needs a new requirement, a superseding record
here, and a change to what the site tells visitors about their files. Deleting a
guard rule to get a branch green is not that decision.
