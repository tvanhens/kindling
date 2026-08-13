/**
 * Themes.
 *
 * The light palette is the *default* -- it lives in the `defineVars` calls in
 * `./tokens.stylex.ts`, so anything rendered without a theme wrapper is light.
 * A theme is a set of overrides for one var group, produced by
 * `stylex.createTheme`, and applied by spreading `stylex.props(theme)` onto an
 * element. Every descendant sees the overridden variables.
 *
 * This file is deliberately NOT `*.stylex.ts`: `createTheme` may live in a
 * normal module, and this one also exports plain helpers, which a `.stylex.ts`
 * file is not allowed to do.
 */
import * as stylex from "@stylexjs/stylex";

import { color, shadow } from "./tokens.stylex";

/** Dark overrides for the color group. */
const darkColor = stylex.createTheme(color, {
  backdrop: "#131110",
  surface: "#1b1917",
  surfaceSunken: "#141211",
  surfaceHover: "#252220",
  overlay: "rgba(0, 0, 0, 0.6)",

  border: "#302b27",
  borderStrong: "#4a433d",

  text: "#f5f2ef",
  textMuted: "#a8a29b",
  textSubtle: "#7c756d",
  onAccent: "#1a1008",

  primary: "#f97316",
  primaryHover: "#fb923c",
  primaryActive: "#fdba74",
  primaryText: "#fdba74",
  primarySubtle: "#2a1a11",
  primaryBorder: "#5a3418",

  danger: "#f04438",
  dangerHover: "#f97066",
  dangerText: "#fda29b",
  dangerSubtle: "#2a1514",
  dangerBorder: "#5c2521",

  success: "#3ccb7f",
  successText: "#7be0ac",
  successSubtle: "#0f2018",
  successBorder: "#1f4433",

  warning: "#f5a524",
  warningText: "#fcd34d",
  warningSubtle: "#2a1f0e",
  warningBorder: "#54401a",

  focusRing: "#fb923c",
  focusHalo: "rgba(251, 146, 60, 0.32)",
});

/** Dark overrides for the shadow group -- deeper and more opaque. */
const darkShadow = stylex.createTheme(shadow, {
  none: "none",
  sm: "0 1px 2px rgba(0, 0, 0, 0.5)",
  md: "0 2px 4px rgba(0, 0, 0, 0.45), 0 4px 14px rgba(0, 0, 0, 0.5)",
  lg: "0 10px 20px rgba(0, 0, 0, 0.5), 0 28px 56px rgba(0, 0, 0, 0.55)",
  inset: "inset 0 1px 2px rgba(0, 0, 0, 0.45)",
});

/**
 * Apply to a root element to switch the whole subtree to dark:
 *
 *   <html {...stylex.props(theme === "dark" && darkTheme)}>
 *
 * It is a tuple because two var groups are overridden at once; `stylex.props`
 * accepts (nested) arrays, so pass it as-is.
 */
export const darkTheme = [darkColor, darkShadow] as const;

export type ColorScheme = "light" | "dark";

/**
 * Resolve the styles for a color scheme. `light` returns `null`, since light is
 * simply the absence of a theme.
 *
 *   <html {...stylex.props(styles.root, themeFor(scheme))}>
 */
export function themeFor(scheme: ColorScheme) {
  return scheme === "dark" ? darkTheme : null;
}
