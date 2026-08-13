/**
 * Kindling design tokens.
 *
 * RULES FOR THIS FILE (enforced by @stylexjs/enforce-extension + the compiler):
 *  - It must be named `*.stylex.ts`.
 *  - Every export must be a `stylex.defineVars` / `stylex.defineConsts` call.
 *    No components, no helpers, no types, no constants. Adding one breaks the
 *    build for the whole app.
 *
 * `defineVars` emits real CSS custom properties, so every value here can be
 * overridden by a theme (see `./themes.ts`). Values that should never be
 * themeable live in `./breakpoints.stylex.ts` as `defineConsts` instead.
 *
 * The light palette below is the default: warm neutrals (a hint of stone
 * rather than pure grey) with an ember accent -- Kindling. Text/background
 * pairs are checked for >= 4.5:1 contrast in both themes.
 */
import * as stylex from "@stylexjs/stylex";

export const color = stylex.defineVars({
  // --- Surfaces (back to front) ---------------------------------------
  /** Page background, behind everything. */
  backdrop: "#f7f5f2",
  /** Cards, popovers, anything raised above the backdrop. */
  surface: "#ffffff",
  /** Inputs, code blocks, wells -- recessed below the surface. */
  surfaceSunken: "#f1eeea",
  /** Hover/active wash for rows, list items, ghost buttons. */
  surfaceHover: "#f0ede8",
  /** Scrim behind modals and drawers. */
  overlay: "rgba(26, 23, 21, 0.45)",

  // --- Lines ----------------------------------------------------------
  border: "#e4e0d9",
  borderStrong: "#c9c3ba",

  // --- Text -----------------------------------------------------------
  /** Body and headings. */
  text: "#1a1715",
  /** Secondary copy, hints, captions. Still AA on `surface`. */
  textMuted: "#5c554e",
  /** Placeholders and disabled copy. Decorative only. */
  textSubtle: "#8a827a",
  /** Text/icon color on top of `primary`, `danger`, etc. */
  onAccent: "#ffffff",

  // --- Primary (ember) ------------------------------------------------
  /** Solid fills: primary buttons, selected states. */
  primary: "#c2410c",
  primaryHover: "#9a3412",
  primaryActive: "#7c2d12",
  /** Accent text and links on a light surface. */
  primaryText: "#9a3412",
  /** Tinted background for badges, callouts, focus rows. */
  primarySubtle: "#fdf0e7",
  primaryBorder: "#f2c6a8",

  // --- Status ---------------------------------------------------------
  danger: "#b42318",
  dangerHover: "#912018",
  dangerText: "#912018",
  dangerSubtle: "#fef3f2",
  dangerBorder: "#f5c4c0",

  success: "#15803d",
  successText: "#166534",
  successSubtle: "#f1faf3",
  successBorder: "#bfe3ca",

  warning: "#b45309",
  warningText: "#92400e",
  warningSubtle: "#fffaeb",
  warningBorder: "#f2ddad",

  // --- Focus ----------------------------------------------------------
  /** Solid inner ring; always meets 3:1 against adjacent surfaces. */
  focusRing: "#c2410c",
  /** Soft outer halo, drawn with box-shadow. */
  focusHalo: "rgba(194, 65, 12, 0.28)",
});

/**
 * 4px base scale. Prefer these over raw pixel values so density can be tuned
 * globally (and per-theme, if a fork wants a compact mode).
 */
export const space = stylex.defineVars({
  none: "0",
  xxs: "2px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px",
  xxxl: "48px",
  huge: "64px",
});

export const radius = stylex.defineVars({
  none: "0",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  xxl: "24px",
  pill: "9999px",
});

export const font = stylex.defineVars({
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',

  size2xs: "11px",
  sizeXs: "12px",
  sizeSm: "14px",
  sizeMd: "16px",
  sizeLg: "18px",
  sizeXl: "20px",
  size2xl: "24px",
  size3xl: "30px",
  size4xl: "38px",
  size5xl: "48px",

  weightRegular: "400",
  weightMedium: "500",
  weightSemibold: "600",
  weightBold: "700",

  lineTight: "1.15",
  lineSnug: "1.3",
  lineNormal: "1.55",
  lineRelaxed: "1.7",

  trackingTight: "-0.02em",
  trackingNormal: "0",
  trackingWide: "0.04em",
});

/**
 * Shadows are themed separately from `color` because dark UIs need deeper,
 * higher-contrast shadows rather than the same rgba at a different opacity.
 */
export const shadow = stylex.defineVars({
  none: "none",
  sm: "0 1px 2px rgba(26, 23, 21, 0.06), 0 1px 1px rgba(26, 23, 21, 0.04)",
  md: "0 2px 4px rgba(26, 23, 21, 0.06), 0 4px 12px rgba(26, 23, 21, 0.07)",
  lg: "0 8px 16px rgba(26, 23, 21, 0.08), 0 24px 48px rgba(26, 23, 21, 0.10)",
  inset: "inset 0 1px 2px rgba(26, 23, 21, 0.06)",
});

/** Durations and easings, so motion stays consistent across primitives. */
export const motion = stylex.defineVars({
  fast: "120ms",
  base: "180ms",
  slow: "280ms",
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
});
