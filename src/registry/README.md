# The tool registry

Every tool on ToolPilot comes from here. One entry in
[`tools.ts`](./tools.ts) drives the tool's route, its card on the home page and
its category pages, its entry in the search index, its metadata and structured
data, and its line in the sitemap. **`tools.ts` is the only file in the
repository that enumerates tools** — if a tool is listed somewhere by hand,
that listing is a bug.

## The files

| File             | What it holds                                                       |
| ---------------- | ------------------------------------------------------------------- |
| `categories.ts`  | The five fixed v1 categories, and the `Category` type from them     |
| `limits.ts`      | Size caps (25 MB image, 100 MB PDF, 10 MB text) and accepted types  |
| `types.ts`       | The `ToolEntry` shape, and the zod schema that mirrors it           |
| `tools.ts`       | **The tools.** The one enumeration                                  |
| `components.ts`  | Slug → dynamically imported tool component. The one wiring point     |
| `select.ts`      | The selector logic, as pure functions over any registry             |
| `index.ts`       | The public surface: the selectors bound to the registry, and URLs   |
| `validate.ts`    | Build-time validation, run by `pnpm validate:registry`              |
| `fixtures.ts`    | Test-only fixtures; nothing that ships imports them                 |

## Adding a tool

1. Add an entry to `tools.ts` with `published: false`.
2. Build the component under `src/tools/<slug>/`, in its own ticket.
3. Add its loader to `components.ts`:
   `'<slug>': () => import('@/tools/<slug>')`.
4. Flip `published` to `true` **in the same change as step 3.**

That is the whole procedure. No route, listing, navigation entry, search
record or sitemap line is written by hand.

### Why `published` starts false

A published entry is routed. A routed page with no component on it is a page
that says nothing to the visitor who landed on it from search, and REQ-2 is
explicit that there are no 'coming soon' pages. So the flag and the component
arrive together, in one commit, and until then the tool is invisible: not
routed, not listed, not indexed, not in the sitemap.

All fifteen v1 entries therefore exist with `published: false` from the
registry ticket onwards, and each tool's own ticket flips its flag.

### Removing a tool

Delete its entry. Its route, its listings, its search results and its sitemap
line go with it, and no other file needs editing. A leftover loader in
`components.ts` is harmless and can be removed whenever the component is.

## What fails the build

`pnpm validate:registry` runs first in `pnpm build`, so these stop the build
with a message naming the entry at fault:

- an entry that does not match the schema — a slug that is not
  lowercase-hyphenated, an empty or multi-line description, no keywords, an
  icon name that is not a lucide-react PascalCase name, a file tool that
  accepts no file type, a text tool that lists some;
- **two entries sharing a slug** — the message names the slug;
- **a category outside the five** — the message names the category. This is
  also a type error, because `Category` is derived from the category tuple;
- **a published entry with no component** — the message names the slug.

Slugs are stable. A slug is never reused for a different tool, because it is
the tool's URL and its key in a visitor's favourites and recents.

## Reading the registry

Read tools through `index.ts` and never from `tools.ts` directly:

```ts
import { getToolsByCategory, toolUrl } from '@/registry';

const tools = getToolsByCategory('image-tools'); // published only, A–Z by name
const href = toolUrl(tools[0]); // the one canonical path: /tools/<slug>
```

`toolUrl()` is the only way to link to a tool. A tool listed under two
categories still has exactly one page, and both category pages link to it with
the same URL.

Everything in `index.ts` is synchronous and pure: the registry is compiled into
the static build, so there is nothing to fetch, nothing to await and nothing to
cache. Only `validate.ts` imports zod, which is what keeps the schema out of
the browser bundle.
