# Decision records

One file per decision that would otherwise have to be explained again every time
someone asks "why is it like this?". Each is numbered, dated and immutable: if a
decision changes, a new record supersedes the old one and says so, rather than
the old one being edited into agreement with the present.

A record earns its place here when the code cannot carry the reason on its own —
a rule enforced by a script, a deliberate omission, a constraint that came from
outside the repository. Day-to-day choices belong in the code and its comments.

| #    | Decision                                                                 | Status   |
| ---- | ------------------------------------------------------------------------ | -------- |
| 0001 | [v1 has no backend](./0001-no-backend.md)                                | Accepted |
| 0002 | [Design tokens as CSS custom properties](./0002-design-tokens.md)        | Accepted |
| 0003 | [Dependency licences are allow-listed](./0003-dependency-licences.md)    | Accepted |
| 0004 | [Heavy libraries load by dynamic import only](./0004-dynamic-imports.md) | Accepted |
