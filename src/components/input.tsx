import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef, Ref } from "react";

import { prefers } from "~/styles/breakpoints.stylex";
import { color, font, motion, radius, space } from "~/styles/tokens.stylex";

const styles = stylex.create({
  base: {
    borderColor: { default: color.border, ":focus": color.focusRing },
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    backgroundColor: color.surface,
    // The focus ring is a box-shadow so it never affects layout.
    boxShadow: { default: "none", ":focus": `0 0 0 3px ${color.focusHalo}` },
    color: color.text,
    display: "block",
    fontFamily: font.sans,
    lineHeight: font.lineNormal,
    outlineStyle: "none",
    transitionDuration: { default: motion.fast, [prefers.reducedMotion]: "0s" },
    transitionProperty: "border-color, box-shadow",
    transitionTimingFunction: motion.easeOut,
    width: "100%",
    "::placeholder": { color: color.textSubtle },
  },
  disabled: {
    backgroundColor: color.surfaceSunken,
    color: color.textMuted,
    cursor: "not-allowed",
  },
  invalid: {
    borderColor: { default: color.danger, ":focus": color.danger },
    boxShadow: {
      default: "none",
      ":focus": `0 0 0 3px ${color.dangerBorder}`,
    },
  },
  textarea: {
    paddingBlock: space.sm,
    paddingInline: space.md,
    fontSize: font.sizeSm,
    resize: "vertical",
    height: "auto",
    minHeight: 96,
  },
});

const sizes = stylex.create({
  sm: {
    paddingInline: space.sm,
    fontSize: font.sizeSm,
    height: 32,
  },
  md: {
    paddingInline: space.md,
    fontSize: font.sizeSm,
    height: 40,
  },
  lg: {
    paddingInline: space.lg,
    fontSize: font.sizeMd,
    height: 48,
  },
});

export type InputSize = keyof typeof sizes;

export type InputOwnProps = {
  /** Paints the error border and sets `aria-invalid`. `Field` wires this up. */
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
  size?: InputSize;
  style?: StyleXStyles;
};

export type InputProps = InputOwnProps &
  Omit<ComponentPropsWithoutRef<"input">, keyof InputOwnProps | "className">;

/**
 * A text input. Prefer wrapping it in `Field`, which supplies the label,
 * hint/error text and the `aria-describedby` wiring.
 */
export function Input({
  disabled = false,
  invalid = false,
  ref,
  size = "md",
  style,
  type = "text",
  ...rest
}: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      disabled={disabled}
      ref={ref}
      type={type}
      {...rest}
      {...stylex.props(
        styles.base,
        sizes[size],
        invalid && styles.invalid,
        disabled && styles.disabled,
        style,
      )}
    />
  );
}

export type TextareaOwnProps = {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
  style?: StyleXStyles;
};

export type TextareaProps = TextareaOwnProps &
  Omit<ComponentPropsWithoutRef<"textarea">, keyof TextareaOwnProps | "className">;

/** Multi-line sibling of `Input`, same visual language. */
export function Textarea({
  disabled = false,
  invalid = false,
  ref,
  style,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      disabled={disabled}
      ref={ref}
      {...rest}
      {...stylex.props(
        styles.base,
        styles.textarea,
        invalid && styles.invalid,
        disabled && styles.disabled,
        style,
      )}
    />
  );
}
