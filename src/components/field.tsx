import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement, useId } from "react";

import { color, font, space } from "~/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    gap: space.xs,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  label: {
    color: color.text,
    fontFamily: font.sans,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
    lineHeight: font.lineSnug,
  },
  message: {
    margin: 0,
    fontFamily: font.sans,
    fontSize: font.sizeXs,
    lineHeight: font.lineSnug,
  },
  hint: {
    color: color.textMuted,
  },
  error: {
    color: color.dangerText,
  },
  required: {
    color: color.dangerText,
    marginInlineStart: space.xxs,
  },
});

export type FieldProps = {
  /**
   * The control. If it is a single React element, `Field` injects `id`,
   * `aria-describedby`, `aria-required` and `invalid` automatically. Pass a
   * render function when you need the ids yourself.
   */
  children: ReactNode | ((ids: FieldIds) => ReactNode);
  /** Error message. When present it replaces the hint and marks the control invalid. */
  error?: string | undefined;
  /** Helper text shown under the control. */
  hint?: string | undefined;
  /** Override the generated control id (e.g. to match an external form lib). */
  id?: string | undefined;
  label: ReactNode;
  required?: boolean;
  style?: StyleXStyles;
};

export type FieldIds = {
  /** Value for the control's `aria-describedby`. */
  describedBy: string | undefined;
  errorId: string;
  hintId: string;
  id: string;
  invalid: boolean;
};

/**
 * Label + control + hint/error, with the accessibility wiring done once so the
 * auth forms cannot get it wrong. The error message is a live region, so a
 * failed submit is announced without moving focus.
 */
export function Field({ children, error, hint, id, label, required = false, style }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const invalid = error !== undefined && error !== "";

  const describedBy =
    [invalid ? errorId : null, hint !== undefined && hint !== "" ? hintId : null]
      .filter((value): value is string => value !== null)
      .join(" ") || undefined;

  const ids: FieldIds = { describedBy, errorId, hintId, id: controlId, invalid };

  let control: ReactNode;
  if (typeof children === "function") {
    control = children(ids);
  } else if (isValidElement(children)) {
    control = cloneElement(children as ReactElement<Record<string, unknown>>, {
      "aria-describedby": describedBy,
      "aria-required": required || undefined,
      id: controlId,
      invalid,
    });
  } else {
    control = children;
  }

  return (
    <div {...stylex.props(styles.root, style)}>
      <label htmlFor={controlId} {...stylex.props(styles.label)}>
        {label}
        {required ? (
          <span aria-hidden="true" {...stylex.props(styles.required)}>
            *
          </span>
        ) : null}
      </label>
      {control}
      {invalid ? (
        <p id={errorId} role="alert" {...stylex.props(styles.message, styles.error)}>
          {error}
        </p>
      ) : hint !== undefined && hint !== "" ? (
        <p id={hintId} {...stylex.props(styles.message, styles.hint)}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
