# Styles

Kindling styles with [StyleX](https://stylexjs.com): atomic CSS compiled at
build time, zero runtime, no class name collisions. Read this before you touch
anything in `src/styles/`.

## Layout of this directory

| File                    | What it is                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `tokens.stylex.ts`      | `defineVars` -- every themeable value (color, space, radius, type, shadow, motion). |
| `breakpoints.stylex.ts` | `defineConsts` -- media query strings and the z-index scale.                        |
| `themes.ts`             | `createTheme` overrides. Light is the default; `darkTheme` is opt-in.               |
| `app.css`               | The CSS entrypoint + global reset. Import once, from the root route.                |

## The rule that breaks the build if you ignore it

**A `*.stylex.ts` file may only contain named exports that are
`defineVars` / `defineConsts` calls.** No components, no helpers, no types,
no plain constants, no default export.

```ts
// tokens.stylex.ts
export const color = stylex.defineVars({ ... }); // ok
export type ColorToken = keyof typeof color; //  NOT ok -- breaks compilation
```

The compiler treats these files specially: it evaluates them at build time to
generate the CSS custom properties, and it needs to resolve them from other
modules by file path. That is also why the `.stylex.ts` extension is mandatory
and enforced by `@stylexjs/enforce-extension` in `.oxlintrc.json`.

Anything derived from tokens (types, helpers, themes) goes in a normal `.ts`
file -- see `themes.ts`.

## `defineVars` vs `defineConsts`

- `defineVars` emits a real CSS custom property. Use it when a value should be
  overridable by a theme. Everything in `tokens.stylex.ts` is a var.
- `defineConsts` compiles away completely -- the literal is inlined at each use
  site and no custom property exists. Use it for things a custom property
  _cannot_ express (media query text) or should never override (z-index).

```ts
// A var cannot be used inside a media condition, hence defineConsts:
fontSize: { default: font.size2xl, [breakpoint.md]: font.size3xl }
```

## Theming

The light palette lives in the `defineVars` defaults, so unthemed markup is
light. `themes.ts` builds the dark overrides with `createTheme` and exports them
as `darkTheme`, a tuple (two var groups are overridden: `color` and `shadow`).

Apply it on a root element; every descendant picks it up:

```tsx
import * as stylex from "@stylexjs/stylex";
import { darkTheme } from "~/styles/themes";

<html {...stylex.props(scheme === "dark" && darkTheme)}>
```

Do **not** add a `className` next to a `stylex.props()` spread on the same
element -- the last one wins and you will lose styles silently.

To add a token: add it to the `defineVars` group _and_ to the matching
`createTheme` override in `themes.ts`. `createTheme` is typed against the var
group, so TypeScript will point at anything you forget.

## Writing styles

```ts
const styles = stylex.create({
  card: {
    backgroundColor: color.surface,
    // Conditions nest INSIDE the property and need a `default` key.
    // A `:hover` or `@media` key at the top level of a namespace is invalid.
    borderColor: { default: color.border, ":hover": color.borderStrong },
    padding: space.lg,
  },
  // Dynamic values are arrow-function namespaces; keep them rare, they emit
  // inline custom properties.
  width: (px: number) => ({ width: px }),
});
```

Other things the linter will hold you to (all configured in `.oxlintrc.json`):

- keys sorted (`sort-keys`) -- run `bun run lint:fix`, it sorts for you;
- no ambiguous shorthands (`valid-shorthands`) -- prefer `paddingInline` /
  `paddingBlock` over `padding: "8px 12px"`;
- no conflicting shorthand + longhand in one namespace (`no-conflicting-props`).

Bare numbers are pixels (`padding: 8` === `8px`).

## Build wiring

`@stylexjs/unplugin` runs in `vite.config.ts` and **must be listed before
`@vitejs/plugin-react`**, or React Fast Refresh stops working. Two options
there are load-bearing:

- `aliases` + `unstable_moduleResolution` -- StyleX resolves `*.stylex.ts`
  imports with its own resolver and never sees Vite's `resolve.alias`. Without
  them, `import { color } from "~/styles/tokens.stylex"` fails the build.
- `runtimeInjection: false` -- all CSS is extracted; nothing is injected at
  runtime.

Compiled rules are appended to the CSS asset built from `app.css`, as
`@layer priority1..N`. Because `@layer reset` is declared in `app.css` first, it
sorts below every component style. Keep the reset in that layer.
