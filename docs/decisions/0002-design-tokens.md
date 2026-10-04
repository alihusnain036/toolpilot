# 0002 — Design tokens are CSS custom properties, one set with two value sets

- **Status:** Accepted
- **Date:** 2026-10-04
- **Applies to:** REQ-1 step 4, and every ticket that renders anything

## Context

ToolPilot needs a light and a dark theme. Tailwind's own answer is the `dark:`
variant: write `bg-white dark:bg-slate-900` and let the class decide. That works,
but it means every themed colour is named twice at every use site, and the
theme's actual definition is spread across hundreds of class attributes. Changing
one colour becomes a search-and-replace, and a component written without its
`dark:` half looks fine to its author and broken to half the audience.

The ticket calls for "a theme built on CSS custom properties for colour,
spacing, radius and type scale — light and dark as one token set with two value
sets". This record is why that shape, and what was done about the values.

## Decision

**Tokens are CSS custom properties declared in `app/globals.css`.** `:root`
carries the light values; `.dark` overrides the same names with the dark ones.
Tailwind's theme in `tailwind.config.ts` refers to the properties rather than to
literal colours, and `darkMode` is `'class'`.

The consequence worth stating plainly: **`bg-background`, `text-foreground`,
`border-border` and the rest are already correct in both themes.** A component
should not need a `dark:` variant for a themed value. If one appears in a diff,
it is a sign that something is reaching past the token set.

Colours are stored as **bare HSL channels** (`221 83% 53%`, not
`hsl(221 83% 53%)`) and composed in the config as
`hsl(var(--color-primary) / <alpha-value>)`. That is what makes opacity
modifiers — `bg-primary/10`, `ring-ring/50` — work at all; with a complete
colour function in the variable, Tailwind has nowhere to put the alpha.

Tokens are **semantic, not literal**: `--color-muted-foreground`, not
`--color-slate-500`. A palette name is a fact about a colour; a semantic name is
a decision about what the colour is _for_, and only the second survives a
redesign.

The token set covers colour (surfaces, lines, focus ring, brand and the
success/warning/destructive intents, each with a paired `-foreground`), radius
(`sm` to `2xl`), named spacing steps (`gutter`, `stack`, `section`, layered on
top of Tailwind's numeric scale rather than replacing it), the type scale
(`xs`–`4xl`, each with its own line height) and two layout widths (`content`,
`prose`).

### The value question, answered honestly

The ticket says token values should come from the approved design (SCR-22
onwards), and "where the design leaves a value unstated, use the nearest
Tailwind default".

**No token values were available.** The project's knowledge base contains no
design document, no token table and no screen numbered SCR-22 — searching it for
the design and for SCR-22 specifically returns only prose about the product.
The design pass that would produce those values has not happened yet.

So the ticket's own fallback was applied to the whole set, not to a few gaps:
every value here is the nearest Tailwind default or a plain derivation of one.
The greys are Tailwind's `slate` ramp, the primary is `blue-600` (light) and
`blue-500` (dark), the intents are `green-600`/`amber-500`/`red-600` and their
dark-mode counterparts, the radii and type scale are Tailwind's own, and the
spacing steps are `4`, `6` and `16`.

**This is scaffolding with the right shape, not the approved palette.** It is
deliberately unremarkable so that nobody mistakes it for a design decision.

## Consequences

- **Good:** the theme has exactly one definition, in one file, and retuning it
  is editing a list of numbers. When the design lands, the work is replacing
  values in `globals.css` — not touching components.
- **Good:** no component carries `dark:` for a themed colour, so a component
  cannot be half-themed by omission.
- **Good:** a runtime theme switch is a class on `<html>`. No re-render, no
  flash of the wrong palette once the shell ticket adds the toggle.
- **Bad:** the indirection is real. `bg-primary` no longer tells you what colour
  it is; you have to look. That is the price of being able to change it.
- **Bad:** a custom property cannot be read at build time, so anything needing
  a literal colour value in JavaScript — a canvas fill, an OG image — has to
  duplicate it or read it from the computed style. Prefer the latter.
- **Open:** the values are placeholders. A design ticket should replace them and
  supersede this section; until it does, nobody should cite these colours as
  ToolPilot's brand.

## Notes for whoever lands the real design

- Keep the token _names_. They are referenced across `tailwind.config.ts` and
  every component; the names are the contract, the values are not.
- Supply both value sets. A dark value is not derivable from a light one —
  dark-mode surfaces usually need a lifted, desaturated hue rather than an
  inverted one, which is why `--color-card` is lighter than `--color-background`
  in the dark set and identical to it in the light one.
- Check the contrast of each `-foreground` against its pair. The focus ring in
  particular has to clear 3:1 against both the background and the component it
  outlines.
