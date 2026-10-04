# 0004 — Heavy libraries are loaded by dynamic import only

- **Status:** Accepted
- **Date:** 2026-10-04
- **Applies to:** REQ-1 step 10, and every ticket that builds a tool

## Context

[0001](./0001-no-backend.md) puts all the work in the browser. That means the
browser has to carry the libraries that do it, and those libraries are large:
`pdf.js` and `pdf-lib` are hundreds of kilobytes each, image codecs bring
WebAssembly with them, and a QR library is small only by comparison.

ToolPilot's shape makes this sharper than usual. A visitor arrives for _one_
tool. Someone cropping an image has no use for the PDF engine, and the home page
has no use for any of them. If the libraries are in the shared bundle, every
visitor downloads every tool before seeing anything — and the page that suffers
most is the first one anybody loads.

The mechanism that spreads this is quiet: a shared module such as
`src/lib/pdf/index.ts` adds `import { PDFDocument } from 'pdf-lib'` at its top,
something unrelated imports a helper from that module, and the bundler — which
has no way to know the helper does not need `pdf-lib` — pulls the whole library
into the common chunk. Nothing looks wrong in the diff. The bundle just grows.

## Decision

**A heavy library is loaded only through `await import()`, inside a client
component or a worker, at the moment the work is requested.** Never at the top
level of a module, and never at the top level of a shared one.

This covers `pdf-lib`, `pdf.js` (`pdfjs-dist`), image processing and codec
libraries, QR generation and reading libraries, and anything else that is both
large and used by one tool. In short: if it does the work of a tool, it loads
when the tool does the work.

### What this looks like

Wrong — `pdf-lib` is now in the shared chunk for every page that touches this
module:

```ts
// src/lib/pdf/merge.ts
import { PDFDocument } from 'pdf-lib';

export async function mergePdfs(files: File[]): Promise<Blob> {
  const out = await PDFDocument.create();
  // …
}
```

Right — the module is free to import, and `pdf-lib` arrives on first use:

```ts
// src/lib/pdf/merge.ts
export async function mergePdfs(files: File[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib');
  const out = await PDFDocument.create();
  // …
}
```

Also right, and better for anything that blocks — the library never touches the
main thread at all:

```ts
// in a client component
const worker = new Worker(new URL('./merge.worker.ts', import.meta.url));
```

```ts
// merge.worker.ts
self.onmessage = async (event) => {
  const { PDFDocument } = await import('pdf-lib');
  // …
};
```

And for a component that is itself heavy, Next's own wrapper:

```ts
const PdfPreview = dynamic(() => import('./pdf-preview'), { ssr: false });
```

### Three rules that follow from it

1. **The import goes where the work happens**, not in a barrel file. A module
   that re-exports from ten tools defeats the whole arrangement, because
   importing one name from it reaches all ten.
2. **`ssr: false` where a library touches browser APIs.** Every route is
   prerendered at build time ([0001](./0001-no-backend.md)), and a library that
   expects `window`, `Worker` or `OffscreenCanvas` will throw during the
   prerender. The dynamic import usually sidesteps this by not running at
   build time at all; `ssr: false` makes it explicit for components.
3. **Loading is a visible state.** A dynamic import takes real time on a real
   connection. A tool shows that it is preparing rather than appearing frozen,
   and handles a failed import — a flaky network mid-session is the normal case,
   not the exceptional one.

### How it is enforced

**By convention and review**, which is what REQ-1 asks for. There is no script
for it, and that is an honest limitation: a static rule cannot reliably tell a
legitimate top-level import in a leaf client component from one in a module that
turns out to be shared, because "shared" is a property of the import graph
rather than of the file.

What stands in for a script:

- This record, and the rule restated in `README.md`.
- Review of any new top-level import of a tool library — the diff is small and
  obvious once a reviewer knows to look.
- `next build`'s route table, printed on every build and in CI. The First Load
  JS column is the measurement that matters: if a shared chunk jumps by a few
  hundred kilobytes, this rule was broken, and the number says so on the pull
  request that broke it.

A bundle-size budget enforced in CI would make this automatic. It is out of
scope for this ticket and worth a ticket of its own.

## Consequences

- **Good:** the first load stays small, and it stays small as tools are added.
  A twentieth tool costs its own chunk, not twenty-fold shared weight.
- **Good:** each tool's cost is attributable. The route table shows which tool
  is expensive, so an optimisation can be aimed.
- **Bad:** every tool's entry point is asynchronous, which pushes a loading
  state into the UI of each one. That is more work per tool, and it is the right
  trade: the alternative is paying the latency up front, for everyone, including
  the people who never use that tool.
- **Bad:** the first use of a tool is slower than it would be with the library
  already present. Caching makes the second use fast; prefetching on intent
  (hover, focus) is available if a tool needs it.
- **Bad:** it is easy to regress and the regression is invisible in behaviour —
  everything still works, just heavier. Hence the reliance on the route table
  rather than on anyone remembering.
