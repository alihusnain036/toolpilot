# 0003 — Production dependencies are licence allow-listed, checked in CI

- **Status:** Accepted
- **Date:** 2026-10-04
- **Applies to:** REQ-1 step 9, and every ticket that adds a dependency

## Context

ToolPilot ships its dependencies. There is no server keeping them at arm's
length: every production dependency is compiled into a JavaScript bundle and
distributed to every visitor. For licensing purposes that is the strongest form
of distribution there is.

A copyleft dependency in that bundle attaches obligations to ToolPilot itself —
source disclosure under the GPL, network-use disclosure under the AGPL. The
tools v1 wants (PDF manipulation, image codecs, QR generation) are exactly the
area where popular libraries are sometimes GPL or dual-licensed, so this is not
a hypothetical.

The failure mode is quiet. Nobody adds a GPL library on purpose; it arrives four
levels deep in the dependency tree of something reasonable, and it is found
during due diligence months later, when removing it means rewriting a feature.

## Decision

**Every production dependency, direct and transitive, must carry one of six
permissive licences:** `MIT`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`,
`ISC`, `0BSD`. Anything else fails the build.

`scripts/check-licences.mjs` (`pnpm licences`) enforces this, and CI runs it as
its own step on every pull request and on `main`. It prints the full list with
each licence, so the output is also the inventory a legal review would ask for.

Four details of how it works, each deliberate:

- **The tree comes from pnpm, not from `node_modules`.** pnpm installs into a
  symlinked virtual store, so walking `node_modules` finds only the handful of
  direct dependencies and silently misses every transitive one — the exact
  dependencies this check exists to catch. `pnpm list --prod --depth Infinity
--json` is the only thing that knows the real shape. (The alternative,
  `node-linker=hoisted` in `.npmrc`, would give up pnpm's main benefit to make
  one script simpler.)
- **Dev dependencies are out of scope.** A GPL test runner is not distributed
  and attaches no obligation. Widening the check to dev dependencies would mean
  rejecting tools for no legal reason, and the noise would get the check
  disabled.
- **Compound expressions are evaluated, not string-matched.** `(MIT OR GPL-2.0)`
  passes — a dual licence lets us take the permissive branch. `MIT AND GPL-3.0`
  fails: both obligations apply. A naive substring check gets both wrong.
- **An undeclared licence fails.** "No licence" is not permission; it is the
  absence of it. Likewise `UNLICENSED`, which means proprietary, not public
  domain.

### Exceptions

Rarely, a package is unavoidable and its licence is not a code-copyleft problem.
Those live in the `EXCEPTIONS` map in the script, and an exception must:

1. **name the package**, never a licence or a pattern — one exception clears one
   package and nothing else;
2. **pin the licence it was granted for**, so a version bump that relicenses the
   package fails the check again instead of inheriting the exemption;
3. **carry a written reason** a reviewer can check without trusting the author.

Adding one is a visible diff in a file that exists only for this purpose, which
is the point.

**There is one exception today:**

| Package        | Licence     | Why                                                                                                                                                                                                                                                                                                                           |
| -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `caniuse-lite` | `CC-BY-4.0` | Browser-support **data** pulled in by Next 14 through its own `browserslist` dependency. It cannot be removed without removing Next. CC-BY-4.0 is an attribution licence over a dataset, not a copyleft code licence, and the data is read at build time to pick compilation targets — none of it reaches the shipped bundle. |

That reasoning looks right to an engineer, and it is the industry's ordinary
treatment of this package, but it is a legal judgement and an engineer is not
the right person to make it. It has been **raised as an open question for legal
review**; if the answer is that attribution is required, the fix is a line in
the site's third-party notices, not a code change.

### The one thing the check cannot prove about itself

`pnpm licences` passing proves the current tree is clean. It cannot prove that a
GPL dependency _would_ be rejected — not without installing one, which would
mean shipping a GPL dependency to demonstrate that we do not ship GPL
dependencies.

So the rejection path is covered by unit tests instead
(`scripts/check-licences.test.ts`): the allow-list is exactly the six names, the
SPDX evaluator rejects GPL, AGPL, LGPL, SSPL, non-commercial Creative Commons
and `UNLICENSED`, OR and AND combine as described above, a missing licence
fails, and an exception does not survive a licence change or leak to another
package.

## Consequences

- **Good:** a copyleft dependency cannot reach `main` unnoticed. It is caught on
  the pull request that introduces it, when removing it is still cheap.
- **Good:** the licence inventory is generated, not maintained by hand, so it
  cannot drift from what is actually installed.
- **Bad:** a genuinely useful GPL library is simply unavailable. If one turns out
  to be the only practical way to build a tool, that is a product decision —
  either the tool is dropped or ToolPilot's own licensing changes. Not a
  decision to make by editing the allow-list.
- **Bad:** some packages declare their licence sloppily, or only in a `LICENSE`
  file. The checker's inferred results (marked `*`) are honoured, which trusts
  its inference; a package with no determinable licence fails and has to be
  looked at by a person.
- **Note:** packages listed by pnpm but not present on disk — the per-platform
  `@next/swc-*` binaries for other operating systems — are reported separately
  and not failed. They are never installed on the build machine and so are never
  distributed by it.

## Adding a dependency

Run `pnpm licences` before opening the pull request. If it fails, the first
question is whether the dependency is needed at all; the second is whether a
permissively licensed equivalent exists. An exception is the last resort, not
the first.
