/**
 * Values that are never themeable.
 *
 * `defineConsts` compiles away completely -- no CSS custom property is emitted
 * and the literal string is inlined at every use site. That is exactly what you
 * want for media query text (a custom property cannot be used in a media
 * condition) and for z-index, where a runtime override would only cause
 * stacking bugs.
 *
 * Same file rules apply: `*.stylex.ts`, named exports, nothing but
 * `defineConsts`/`defineVars` calls.
 */
import * as stylex from "@stylexjs/stylex";

/**
 * Mobile-first min-width queries. Use as computed keys inside a property:
 *
 *   fontSize: { default: font.size2xl, [breakpoint.md]: font.size3xl }
 */
export const breakpoint = stylex.defineConsts({
  /** >= 640px -- large phone, small tablet. */
  sm: "@media (min-width: 40rem)",
  /** >= 768px -- tablet. */
  md: "@media (min-width: 48rem)",
  /** >= 1024px -- laptop. */
  lg: "@media (min-width: 64rem)",
  /** >= 1280px -- desktop. */
  xl: "@media (min-width: 80rem)",
});

/** User-preference queries, same usage as `breakpoint`. */
export const prefers = stylex.defineConsts({
  dark: "@media (prefers-color-scheme: dark)",
  reducedMotion: "@media (prefers-reduced-motion: reduce)",
  hover: "@media (hover: hover)",
});

/** One stacking scale for the whole app. Never hand-write a z-index. */
export const layer = stylex.defineConsts({
  base: "0",
  raised: "10",
  sticky: "20",
  dropdown: "30",
  overlay: "40",
  modal: "50",
  toast: "60",
});
