import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef, ElementType, ReactNode, Ref } from "react";

import { breakpoint } from "~/styles/breakpoints.stylex";
import { color, font } from "~/styles/tokens.stylex";

const sizes = stylex.create({
  xs: { fontSize: font.sizeXs, lineHeight: font.lineNormal },
  sm: { fontSize: font.sizeSm, lineHeight: font.lineNormal },
  md: { fontSize: font.sizeMd, lineHeight: font.lineNormal },
  lg: { fontSize: font.sizeLg, lineHeight: font.lineRelaxed },
  xl: { fontSize: font.sizeXl, lineHeight: font.lineSnug },
});

const tones = stylex.create({
  accent: { color: color.primaryText },
  danger: { color: color.dangerText },
  default: { color: color.text },
  inherit: { color: "inherit" },
  muted: { color: color.textMuted },
  onAccent: { color: color.onAccent },
  subtle: { color: color.textSubtle },
  success: { color: color.successText },
  warning: { color: color.warningText },
});

const weights = stylex.create({
  bold: { fontWeight: font.weightBold },
  medium: { fontWeight: font.weightMedium },
  regular: { fontWeight: font.weightRegular },
  semibold: { fontWeight: font.weightSemibold },
});

const styles = stylex.create({
  base: {
    margin: 0,
    fontFamily: font.sans,
  },
  mono: { fontFamily: font.mono },
  /** Single-line ellipsis. */
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  /** Visible only to screen readers -- for labels that must exist but not show. */
  srOnly: {
    padding: 0,
    borderWidth: 0,
    overflow: "hidden",
    clipPath: "inset(50%)",
    position: "absolute",
    whiteSpace: "nowrap",
    height: 1,
    width: 1,
  },
});

export type TextSize = keyof typeof sizes;
export type TextTone = keyof typeof tones;
export type TextWeight = keyof typeof weights;

export type TextOwnProps = {
  as?: ElementType;
  children?: ReactNode;
  mono?: boolean;
  ref?: Ref<HTMLElement>;
  size?: TextSize;
  /** Hide visually but keep it in the accessibility tree. */
  srOnly?: boolean;
  style?: StyleXStyles;
  tone?: TextTone;
  truncate?: boolean;
  weight?: TextWeight;
};

export type TextProps = TextOwnProps &
  Omit<ComponentPropsWithoutRef<"span">, keyof TextOwnProps | "className">;

/** Body copy. Defaults to a `<p>`-less inline `<span>` so it nests anywhere. */
export function Text({
  as: Component = "span",
  children,
  mono = false,
  ref,
  size = "md",
  srOnly = false,
  style,
  tone = "default",
  truncate = false,
  weight = "regular",
  ...rest
}: TextProps) {
  return (
    <Component
      ref={ref}
      {...rest}
      {...stylex.props(
        styles.base,
        sizes[size],
        weights[weight],
        tones[tone],
        mono && styles.mono,
        truncate && styles.truncate,
        srOnly && styles.srOnly,
        style,
      )}
    >
      {children}
    </Component>
  );
}

const headingLevels = stylex.create({
  level1: {
    fontSize: { default: font.size4xl, [breakpoint.md]: font.size5xl },
    letterSpacing: font.trackingTight,
    lineHeight: font.lineTight,
  },
  level2: {
    fontSize: { default: font.size3xl, [breakpoint.md]: font.size4xl },
    letterSpacing: font.trackingTight,
    lineHeight: font.lineTight,
  },
  level3: {
    fontSize: { default: font.size2xl, [breakpoint.md]: font.size3xl },
    letterSpacing: font.trackingTight,
    lineHeight: font.lineSnug,
  },
  level4: {
    fontSize: font.sizeXl,
    lineHeight: font.lineSnug,
  },
  level5: {
    fontSize: font.sizeLg,
    lineHeight: font.lineSnug,
  },
  level6: {
    fontSize: font.sizeSm,
    letterSpacing: font.trackingWide,
    lineHeight: font.lineSnug,
    textTransform: "uppercase",
  },
});

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingOwnProps = {
  /** Override the rendered tag without changing the visual level. */
  as?: ElementType;
  children?: ReactNode;
  level?: HeadingLevel;
  ref?: Ref<HTMLHeadingElement>;
  style?: StyleXStyles;
  tone?: TextTone;
  weight?: TextWeight;
};

export type HeadingProps = HeadingOwnProps &
  Omit<ComponentPropsWithoutRef<"h2">, keyof HeadingOwnProps | "className">;

/**
 * Headings scale up one step at the `md` breakpoint. Keep `level` matched to
 * document outline and use `as` when the visual size needs to differ.
 */
export function Heading({
  as,
  children,
  level = 2,
  ref,
  style,
  tone = "default",
  weight = "semibold",
  ...rest
}: HeadingProps) {
  const Component = (as ?? `h${level}`) as ElementType;
  return (
    <Component
      ref={ref}
      {...rest}
      {...stylex.props(
        styles.base,
        headingLevels[`level${level}`],
        weights[weight],
        tones[tone],
        style,
      )}
    >
      {children}
    </Component>
  );
}
