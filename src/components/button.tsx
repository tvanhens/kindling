import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

import { prefers } from "~/styles/breakpoints.stylex";
import { color, font, motion, radius, space } from "~/styles/tokens.stylex";

const spin = stylex.keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

const styles = stylex.create({
  base: {
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    textDecoration: "none",
    alignItems: "center",
    cursor: "pointer",
    display: "inline-flex",
    fontFamily: font.sans,
    fontWeight: font.weightMedium,
    justifyContent: "center",
    lineHeight: font.lineTight,
    // One focus treatment for every variant.
    outlineColor: color.focusRing,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
    position: "relative",
    transitionDuration: { default: motion.fast, [prefers.reducedMotion]: "0s" },
    transitionProperty: "background-color, border-color, color, box-shadow",
    transitionTimingFunction: motion.easeOut,
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  disabled: {
    cursor: "not-allowed",
    opacity: 0.55,
    // Also stops the hover styles below from firing while disabled.
    pointerEvents: "none",
  },
  fullWidth: {
    display: "flex",
    width: "100%",
  },
  label: {
    gap: space.sm,
    alignItems: "center",
    display: "inline-flex",
  },
  // Keep the label in flow while loading so the button never changes size.
  labelHidden: {
    visibility: "hidden",
  },
  spinner: {
    borderRadius: radius.pill,
    borderStyle: "solid",
    borderWidth: 2,
    animationDuration: "600ms",
    animationIterationCount: "infinite",
    animationName: spin,
    animationTimingFunction: "linear",
    borderInlineEndColor: "currentColor",
    borderInlineStartColor: "transparent",
    insetInlineStart: "50%",
    marginInlineStart: "-0.5em",
    position: "absolute",
    borderBottomColor: "currentColor",
    borderTopColor: "transparent",
    height: "1em",
    marginTop: "-0.5em",
    top: "50%",
    width: "1em",
  },
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

const variants = stylex.create({
  primary: {
    borderColor: "transparent",
    backgroundColor: {
      default: color.primary,
      ":hover": color.primaryHover,
      ":active": color.primaryActive,
    },
    color: color.onAccent,
  },
  secondary: {
    borderColor: {
      default: color.border,
      ":hover": color.borderStrong,
    },
    backgroundColor: {
      default: color.surface,
      ":hover": color.surfaceHover,
    },
    color: color.text,
  },
  ghost: {
    borderColor: "transparent",
    backgroundColor: {
      default: "transparent",
      ":hover": color.surfaceHover,
    },
    color: {
      default: color.textMuted,
      ":hover": color.text,
    },
  },
  danger: {
    borderColor: "transparent",
    backgroundColor: {
      default: color.danger,
      ":hover": color.dangerHover,
    },
    color: color.onAccent,
  },
});

const sizes = stylex.create({
  sm: {
    paddingInline: space.md,
    fontSize: font.sizeSm,
    height: 32,
  },
  md: {
    paddingInline: space.lg,
    fontSize: font.sizeSm,
    height: 40,
  },
  lg: {
    paddingInline: space.xl,
    fontSize: font.sizeMd,
    height: 48,
  },
});

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonOwnProps = {
  children?: ReactNode;
  /** Stretch to the container width -- the default for auth forms. */
  fullWidth?: boolean;
  /** Rendered after the label; hidden while `loading`. */
  iconEnd?: ReactNode;
  /** Rendered before the label; hidden while `loading`. */
  iconStart?: ReactNode;
  /** Swaps the label for a spinner and blocks interaction. */
  loading?: boolean;
  /** Announced to screen readers while `loading`. */
  loadingLabel?: string;
  ref?: Ref<HTMLButtonElement>;
  size?: ButtonSize;
  style?: StyleXStyles;
  variant?: ButtonVariant;
};

export type ButtonProps = ButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonOwnProps | "className">;

/**
 * The one button. `loading` hides the label instead of replacing it, so the
 * width never jumps, and sets `aria-busy` + `disabled` so an in-flight request
 * cannot be double-submitted.
 */
export function Button({
  children,
  disabled = false,
  fullWidth = false,
  iconEnd,
  iconStart,
  loading = false,
  loadingLabel = "Loading",
  ref,
  size = "md",
  style,
  type = "button",
  variant = "primary",
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      aria-busy={loading || undefined}
      disabled={isDisabled}
      ref={ref}
      type={type}
      {...rest}
      {...stylex.props(
        styles.base,
        variants[variant],
        sizes[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      )}
    >
      <span {...stylex.props(styles.label, loading && styles.labelHidden)}>
        {iconStart}
        {children}
        {iconEnd}
      </span>
      {loading ? (
        <>
          <span aria-hidden="true" {...stylex.props(styles.spinner)} />
          <span {...stylex.props(styles.srOnly)}>{loadingLabel}</span>
        </>
      ) : null}
    </button>
  );
}
