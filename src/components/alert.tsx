import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { color, font, radius, space } from "~/styles/tokens.stylex";

const styles = stylex.create({
  root: {
    borderRadius: radius.md,
    borderStyle: "solid",
    borderWidth: 1,
    gap: space.sm,
    paddingBlock: space.md,
    paddingInline: space.md,
    display: "flex",
    fontFamily: font.sans,
    fontSize: font.sizeSm,
    lineHeight: font.lineNormal,
  },
  body: {
    gap: space.xxs,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  title: {
    fontWeight: font.weightSemibold,
  },
  icon: {
    flexShrink: 0,
    fontSize: font.sizeMd,
    lineHeight: font.lineTight,
    paddingBlockStart: 1,
  },
});

const tones = stylex.create({
  danger: {
    borderColor: color.dangerBorder,
    backgroundColor: color.dangerSubtle,
    color: color.dangerText,
  },
  info: {
    borderColor: color.primaryBorder,
    backgroundColor: color.primarySubtle,
    color: color.primaryText,
  },
  success: {
    borderColor: color.successBorder,
    backgroundColor: color.successSubtle,
    color: color.successText,
  },
  warning: {
    borderColor: color.warningBorder,
    backgroundColor: color.warningSubtle,
    color: color.warningText,
  },
});

const defaultIcons: Record<AlertTone, string> = {
  danger: "!",
  info: "i",
  success: "✓",
  warning: "!",
};

export type AlertTone = keyof typeof tones;

export type AlertProps = {
  children?: ReactNode;
  /** Replace the default glyph. Pass `null` to drop it entirely. */
  icon?: ReactNode;
  style?: StyleXStyles;
  /** Bold first line, above `children`. */
  title?: ReactNode;
  tone?: AlertTone;
};

/**
 * Inline status message -- the surface for auth errors and confirmations.
 *
 * `danger` renders `role="alert"` (interrupts the screen reader immediately,
 * which is what you want for a failed sign-in); the other tones use
 * `role="status"` so they are announced politely.
 */
export function Alert({ children, icon, style, title, tone = "info" }: AlertProps) {
  const glyph = icon === undefined ? defaultIcons[tone] : icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      {...stylex.props(styles.root, tones[tone], style)}
    >
      {glyph === null ? null : (
        <span aria-hidden="true" {...stylex.props(styles.icon)}>
          {glyph}
        </span>
      )}
      <div {...stylex.props(styles.body)}>
        {title === undefined ? null : <span {...stylex.props(styles.title)}>{title}</span>}
        {children}
      </div>
    </div>
  );
}
